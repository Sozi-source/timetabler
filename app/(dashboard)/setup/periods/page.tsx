'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePeriods } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Period } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const BLANK = {
  label:    '',
  start:    '08:00',
  end:      '09:00',
  order:    1,
  is_break: false,
}

type PeriodForm = typeof BLANK

// Helper: get start time from period regardless of field name
function getStart(p: Period): string {
  return (p.start ?? p.start_time ?? '').slice(0, 5)
}
function getEnd(p: Period): string {
  return (p.end ?? p.end_time ?? '').slice(0, 5)
}

export default function PeriodsPage() {
  const qc = useQueryClient()
  const { data: periods = [], isLoading } = usePeriods()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Period | null>(null)
  const [form,    setForm]    = useState<PeriodForm>({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, order: periods.length + 1 })
    setOpen(true)
  }

  function openEdit(p: Period) {
    setEditing(p)
    setForm({
      label:    p.label    ?? '',
      start:    getStart(p) || '08:00',
      end:      getEnd(p)   || '09:00',
      order:    p.order    ?? 1,
      is_break: p.is_break ?? false,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm({ ...BLANK })
  }

  function set<K extends keyof PeriodForm>(key: K, val: PeriodForm[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.periods })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/periods/${editing.id}/`, form).then(r => r.data)
      : api.post('/periods/', form).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Period updated' : 'Period created')
        invalidate()
        closeModal()
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error — could not save period'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/periods/${id}/`).then(r => r.data),
    onSuccess: (res, id) => {
      if (res.ok) {
        toast.success('Period deleted')
        invalidate()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      if (delId === id) setDelId(null)
    },
    onError: () => {
      toast.error('Network error — could not delete period')
      setDelId(null)
    },
  })

  function handleDelete(p: Period) {
    if (!confirm(`Delete period "${p.label}"? This cannot be undone.`)) return
    setDelId(p.id)
    delMutation.mutate(p.id)
  }

  const sorted = [...periods].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const isValid = form.label.trim().length > 0 && form.start < form.end

  return (
    <SetupShell
      title="Periods"
      subtitle={`${periods.length} period${periods.length !== 1 ? 's' : ''} defined`}
      onAdd={openCreate}
      addLabel="Add period"
    >
      <SetupTable
        loading={isLoading}
        rows={sorted}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<Clock className="h-10 w-10" />}
        emptyMsg="No periods defined yet"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: '#',
            width: '48px',
            render: p => (
              <span className="text-gray-400 text-xs font-mono">{p.order ?? '—'}</span>
            ),
          },
          {
            header: 'Label',
            render: p => (
              <span className="font-medium text-gray-900">{p.label || '—'}</span>
            ),
          },
          {
            header: 'Start',
            render: p => (
              <span className="font-mono text-sm text-gray-700">{getStart(p) || '—'}</span>
            ),
          },
          {
            header: 'End',
            render: p => (
              <span className="font-mono text-sm text-gray-700">{getEnd(p) || '—'}</span>
            ),
          },
          {
            header: 'Duration',
            render: p => {
              const duration = p.duration ?? p.duration_hours
              if (!duration) return <span className="text-gray-400">—</span>
              const h = Math.floor(duration)
              const m = Math.round((duration - h) * 60)
              return (
                <span className="text-sm text-gray-600">
                  {h > 0 ? `${h}h ` : ''}{m > 0 ? `${m}m` : ''}
                </span>
              )
            },
          },
          {
            header: 'Type',
            render: p => (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                p.is_break
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-blue-100 text-blue-700'
              )}>
                {p.is_break ? 'Break' : 'Teaching'}
              </span>
            ),
          },
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Period' : 'Add Period'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Label <span className="text-red-400">*</span>
          </label>
          <input
            value={form.label}
            onChange={e => set('label', e.target.value)}
            placeholder="e.g. Period 1"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={form.start}
              onChange={e => set('start', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={form.end}
              onChange={e => set('end', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {form.start && form.end && form.start >= form.end && (
          <p className="text-xs text-red-500 -mt-1">End time must be after start time.</p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Display order</label>
          <input
            type="number"
            min={1}
            value={form.order}
            onChange={e => set('order', Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <p className="text-xs text-gray-400 mt-1">Periods are displayed in ascending order.</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_break}
            onClick={() => set('is_break', !form.is_break)}
            className={cn(
              'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-1',
              form.is_break ? 'bg-[#1e3a5f]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_break ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <div>
            <span className="text-sm text-gray-700 font-medium">Break / recess</span>
            <p className="text-xs text-gray-400">Break periods are skipped by the scheduler.</p>
          </div>
        </label>
      </SetupModal>
    </SetupShell>
  )
}