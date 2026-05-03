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
import { Users2, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BLANK = {
  name: '',
  programme: '',
  start_year: new Date().getFullYear(),
  start_month: 1,
  student_count: 0,
  is_active: true,
}

type CohortForm = typeof BLANK

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/** Semester index: Jan-Apr=Sem1, May-Aug=Sem2, Sep-Dec=Sem3 */
function semesterIndex(year: number, month: number): number {
  const sem = month <= 4 ? 1 : month <= 8 ? 2 : 3
  return year * 3 + (sem - 1)
}

/** Compute which term a cohort is in using college semester index */
function computeTerm(startYear: number, startMonth: number, totalTerms?: number): number {
  const today = new Date()
  if (today < new Date(startYear, startMonth - 1, 1)) return 1
  const elapsed = semesterIndex(today.getFullYear(), today.getMonth() + 1)
                - semesterIndex(startYear, startMonth)
  return Math.max(1, Math.min(elapsed + 1, totalTerms ?? 99))
}

export default function CohortsPage() {
  const qc = useQueryClient()
  const { data: cohorts = [], isLoading } = useCohorts()
  const { data: programmes = [] } = useProgrammes()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cohort | null>(null)
  const [form, setForm] = useState<CohortForm>({ ...BLANK })
  const [delId, setDelId] = useState<string | null>(null)

  const selectedProg = programmes.find(p => p.id === form.programme)
  const previewTerm  = computeTerm(form.start_year, form.start_month, selectedProg?.total_terms)

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
      : api.post('/cohorts/', {
          ...form,
          programme_id: form.programme,
          current_term: previewTerm,
        }).then(r => r.data),
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

  const syncMutation = useMutation({
    mutationFn: ({ id, term }: { id: string; term: number }) =>
      api.put(`/cohorts/${id}/`, { current_term: term }).then(r => r.data),
    onSuccess: res => {
      if (res.ok) { toast.success('Term synced to calendar'); invalidate() }
      else toast.error(res.error ?? 'Sync failed')
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
          {
            header: 'Name',
            render: c => <span className="font-medium">{c.name}</span>,
          },
          {
            header: 'Programme',
            render: c => <span className="text-sm text-gray-600">{c.programme || '—'}</span>,
          },
          {
            header: 'Intake',
            render: c => (
              <span className="text-sm text-gray-600">
                {c.start_month ? MONTHS[c.start_month - 1] : ''} {c.start_year ?? '—'}
              </span>
            ),
          },
          {
            header: 'Current Term',
            render: c => {
              const computed   = c.computed_current_term ?? c.current_term
              const total      = c.total_terms
              const isFinal    = total != null && computed >= total
              const isComplete = c.enrolment_status === 'COMPLETED'

              // Cohort has been advanced past their final term → truly done
              if (isComplete) {
                return (
                  <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs font-medium flex items-center gap-1 w-fit">
                    ✓ Completed
                  </span>
                )
              }

              // Cohort is currently in their last term — not yet completed
              if (isFinal) {
                return (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium flex items-center gap-1 w-fit">
                    T{computed} · Final Term
                  </span>
                )
              }

              // Normal active cohort
              return (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                    T{computed ?? '—'} / {total ?? '—'}
                  </span>
                  {(c.term_is_synced ?? true)
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : (
                      <button
                        title={`Calendar says T${computed} — click to sync`}
                        onClick={() => syncMutation.mutate({ id: c.id, term: computed })}
                        className="flex items-center gap-1 text-amber-600 hover:text-amber-700"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs">→ T{computed}</span>
                      </button>
                    )
                  }
                </div>
              )
            },
          },
          {
            header: 'Students',
            render: c => <span className="text-sm text-gray-600">{c.student_count ?? 0}</span>,
          },
          {
            header: 'Active',
            render: c => (
              <span className={cn(
                'inline-block h-2 w-2 rounded-full',
                (c.is_active ?? true) ? 'bg-emerald-500' : 'bg-gray-300'
              )} />
            ),
          },
          {
            header: '',
            render: c => {
              const computed   = c.computed_current_term ?? c.current_term ?? 0
              // Only hide Advance for cohorts that are truly COMPLETED (past final term)
              const isComplete = c.enrolment_status === 'COMPLETED'
              if (isComplete) return null
              const nextTerm = computed + 1
              return (
                <button
                  onClick={() => {
                    if (!confirm(`Advance "${c.name}" to term ${nextTerm}?`)) return
                    advanceMutation.mutate(c.id)
                  }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ArrowRight className="h-3 w-3" /> Advance
                </button>
              )
            },
          },
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
            {programmes.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
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
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {form.programme && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Calculated Current Term</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Based on {MONTHS[form.start_month - 1]} {form.start_year} start date
              </p>
            </div>
            <span className="text-lg font-bold text-blue-700">T{previewTerm}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Student Count</label>
          <input
            type="number" min={0}
            value={form.student_count}
            onChange={e => setForm(p => ({ ...p, student_count: +e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={cn(
              'relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer',
              form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_active ? 'translate-x-4' : 'translate-x-0'
            )} />
          </div>
          <span className="text-sm text-gray-700 font-medium">Active</span>
        </label>
      </SetupModal>
    </SetupShell>
  )
}