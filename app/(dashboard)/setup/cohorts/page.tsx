'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCohorts, useProgrammes } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Cohort } from '@/types'
import { advanceCohort } from '@/services/setup'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { Users2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const BLANK = {
  name: '',
  programme: '',
  current_term: 1,
  start_year: new Date().getFullYear(),
  start_month: 1,
  student_count: 0,
  is_active: true,
}

type CohortForm = typeof BLANK

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function CohortsPage() {
  const qc = useQueryClient()
  const { data: cohorts = [], isLoading } = useCohorts()
  const { data: programmes = [] } = useProgrammes()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cohort | null>(null)
  const [form, setForm] = useState<CohortForm>({ ...BLANK })
  const [delId, setDelId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setOpen(true)
  }

  function openEdit(c: Cohort) {
    setEditing(c)
    setForm({
      name:          c.name ?? '',
      programme:     c.programme_id ?? '',
      current_term:  c.current_term ?? 1,
      start_year:    c.start_year ?? new Date().getFullYear(),
      start_month:   c.start_month ?? 1,
      student_count: c.student_count ?? 0,
      is_active:     c.is_active ?? true,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm({ ...BLANK })
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.cohorts })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/cohorts/${editing.id}/`, form).then(r => r.data)
      : api.post('/cohorts/', { ...form, programme_id: form.programme }).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Cohort updated' : 'Cohort created')
        invalidate()
        closeModal()
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error — could not save cohort'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cohorts/${id}/`).then(r => r.data),
    onSuccess: (res, id) => {
      if (res.ok) { toast.success('Cohort deleted'); invalidate() }
      else toast.error(res.error ?? 'Delete failed')
      if (delId === id) setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  const advanceMutation = useMutation({
    mutationFn: (id: string) => advanceCohort(id),
    onSuccess: res => {
      if (res.ok) { toast.success('Cohort advanced to next term'); invalidate() }
      else toast.error(res.error ?? 'Advance failed')
    },
    onError: () => toast.error('Network error'),
  })

  return (
    <SetupShell
      title="Cohorts"
      subtitle={`${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add cohort"
    >
      <SetupTable
        loading={isLoading}
        rows={cohorts}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={c => {
          if (!confirm(`Delete cohort "${c.name}"? This cannot be undone.`)) return
          setDelId(c.id)
          delMutation.mutate(c.id)
        }}
        emptyIcon={<Users2 className="h-10 w-10" />}
        emptyMsg="No cohorts yet"
        onEmptyAdd={openCreate}
        cols={[
          { header: 'Name',      render: c => <span className="font-medium">{c.name}</span> },
          { header: 'Programme', render: c => <span className="text-sm text-gray-600">{c.programme || '—'}</span> },
          { header: 'Term',      render: c => (
            <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
              T{c.current_term ?? '—'}
            </span>
          )},
          { header: 'Intake',    render: c => (
            <span className="text-sm text-gray-600">
              {c.start_month ? MONTHS[c.start_month - 1] : ''} {c.start_year ?? '—'}
            </span>
          )},
          { header: 'Students',  render: c => <span className="text-sm text-gray-600">{c.student_count ?? 0}</span> },
          { header: 'Active',    render: c => (
            <span className={cn('inline-block h-2 w-2 rounded-full', (c.is_active ?? true) ? 'bg-emerald-500' : 'bg-gray-300')} />
          )},
          { header: '', render: c => (
            <button
              onClick={() => {
                if (!confirm(`Advance "${c.name}" to term ${(c.current_term ?? 0) + 1}?`)) return
                advanceMutation.mutate(c.id)
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowRight className="h-3 w-3" /> Advance
            </button>
          )},
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Cohort' : 'Add Cohort'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={!!form.name.trim() && !!form.programme}
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cohort Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. CND-2026-A"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Programme <span className="text-red-400">*</span>
          </label>
          <select
            value={form.programme}
            onChange={e => setForm(p => ({ ...p, programme: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Year</label>
            <input
              type="number" min={2020} max={2040}
              value={form.start_year}
              onChange={e => setForm(p => ({ ...p, start_year: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Month</label>
            <select
              value={form.start_month}
              onChange={e => setForm(p => ({ ...p, start_month: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current Term</label>
            <input
              type="number" min={1} max={12}
              value={form.current_term}
              onChange={e => setForm(p => ({ ...p, current_term: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Student Count</label>
            <input
              type="number" min={0}
              value={form.student_count}
              onChange={e => setForm(p => ({ ...p, student_count: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer', form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-300')}
          >
            <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-4' : 'translate-x-0')} />
          </div>
          <span className="text-sm text-gray-700 font-medium">Active</span>
        </label>
      </SetupModal>
    </SetupShell>
  )
}