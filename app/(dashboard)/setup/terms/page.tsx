'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTerms } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Term } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const BLANK = {
  name:           '',
  start_date:     '',
  end_date:       '',
  teaching_weeks: 12,
  is_current:     false,
}

export default function TermsPage() {
  const qc = useQueryClient()
  const { data: terms = [], isLoading } = useTerms()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Term | null>(null)
  const [form,    setForm]    = useState({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setOpen(true)
  }

  function openEdit(t: Term) {
    setEditing(t)
    setForm({
      name:           t.name,
      start_date:     t.start_date,
      end_date:       t.end_date,
      teaching_weeks: t.teaching_weeks,
      is_current:     t.is_current,
    })
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.terms })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/terms/${editing.id}/`, form).then(r => r.data)
      : api.post('/terms/', form).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Term updated' : 'Term created')
        invalidate()
        setOpen(false)
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/terms/${id}/`).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success('Term deleted')
        invalidate()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(t: Term) {
    if (!confirm(`Delete term "${t.name}"?`)) return
    setDelId(t.id)
    delMutation.mutate(t.id)
  }

  const isValid = !!form.name.trim() && !!form.start_date && !!form.end_date

  return (
    <SetupShell
      title="Terms"
      subtitle={`${terms.length} term${terms.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add term"
    >
      <SetupTable
        loading={isLoading}
        rows={terms}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<CalendarDays className="h-10 w-10" />}
        emptyMsg="No terms defined yet"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: 'Name',
            render: t => (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{t.name}</span>
                {t.is_current && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                    Current
                  </span>
                )}
              </div>
            ),
          },
          {
            header: 'Start',
            render: t => (
              <span className="text-sm text-gray-600 tabular-nums font-mono">{t.start_date}</span>
            ),
          },
          {
            header: 'End',
            render: t => (
              <span className="text-sm text-gray-600 tabular-nums font-mono">{t.end_date}</span>
            ),
          },
          {
            header: 'Weeks',
            width: '70px',
            render: t => (
              <span className="text-sm font-mono tabular-nums text-gray-700">{t.teaching_weeks}</span>
            ),
          },
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Term' : 'Add Term'}
        onClose={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        {/* Term name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Term Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Term 1 2026"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Start + End dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Start Date <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              End Date <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>

        {/* Teaching weeks */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Teaching Weeks
          </label>
          <input
            type="number"
            min={1}
            max={52}
            value={form.teaching_weeks}
            onChange={e => setForm(p => ({ ...p, teaching_weeks: +e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Current term toggle */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_current}
            onClick={() => setForm(p => ({ ...p, is_current: !p.is_current }))}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
              form.is_current ? 'bg-emerald-500' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_current ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <div>
            <span className="text-sm text-gray-800 font-semibold">Set as current term</span>
            <p className="text-xs text-gray-500 mt-0.5">
              This term will be used as the active scheduling period.
            </p>
          </div>
        </div>
      </SetupModal>
    </SetupShell>
  )
}