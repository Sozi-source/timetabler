'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConstraints, usePeriods } from '@/hooks/useSetup'
import { queryKeys, DAY_LABELS } from '@/types'
import type { Constraint, Period } from '@/types'
import { deleteConstraint } from '@/services/setup'
import ConstraintModal from '@/components/features/constraints/ConstraintModal'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(t?: string) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDayTime(
  c: Constraint,
  periodMap: Map<string, Period>,
): { day: string; time: string } {
  const p = c.parameters

  const day = p.day as string | undefined
  const avoidDays = p.avoid_days as string[] | undefined

  const dayLabel =
    day
      ? (DAY_LABELS[day] ?? day)
      : avoidDays?.length
      ? avoidDays.map(d => DAY_LABELS[d] ?? d).join(', ')
      : '—'

  const periodId = p.period_id as string | undefined
  let timeLabel = ''
  if (periodId) {
    const period = periodMap.get(periodId)
    if (period) {
      const start = formatTime(period.start_time || period.start)
      const end   = formatTime(period.end_time   || period.end)
      timeLabel = period.label ? `${period.label} · ${start}–${end}` : `${start}–${end}`
    }
  }

  return { day: dayLabel, time: timeLabel }
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ConstraintsPage() {
  const qc = useQueryClient()

  const { data: constraintsRaw = [], isLoading } = useConstraints()
  const { data: periodsRaw } = usePeriods()
  const periods: Period[] = Array.isArray(periodsRaw) ? periodsRaw : []

  const constraints: Constraint[] = Array.isArray(constraintsRaw)
    ? constraintsRaw
    : ((constraintsRaw as { data?: Constraint[] })?.data ?? [])

  const periodMap = new Map<string, Period>(
    periods.map(p => [String(p.id), p])
  )

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState<Constraint | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConstraint(id),
    onSuccess: (_data, deletedId) => {
      qc.setQueryData(queryKeys.constraints, (old: Constraint[] | undefined) =>
        (old ?? []).filter(c => c.id !== deletedId)
      )
      qc.invalidateQueries({ queryKey: queryKeys.constraints })
      toast.success('Constraint deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Delete failed')
      setDeletingId(null)
    },
  })

  function handleDelete(c: Constraint) {
    if (!confirm('Delete this constraint? This cannot be undone.')) return
    setDeletingId(c.id)
    deleteMutation.mutate(c.id)
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Constraint) { setEditing(c); setModalOpen(true) }

  function resolveUnitName(c: Constraint): { name: string; code: string | null } {
    if (c.curriculum_unit) return { name: c.unit_name ?? '—', code: c.unit_code ?? null }
    return { name: '—', code: null }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Constraints</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#162d4a] active:scale-[.98] transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="h-3.5 w-3.5" />
          Add constraint
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="animate-pulse space-y-px rounded-xl overflow-hidden border border-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50" />
          ))}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!isLoading && constraints.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <ShieldCheck className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No constraints yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a constraint to restrict timetable generation.</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add constraint
          </button>
        </div>
      )}

      {/* ── Table (md+) / Cards (mobile) ────────────────────── */}
      {!isLoading && constraints.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-1/2">
                    Unit
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-1/4">
                    Day
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-1/4">
                    Time
                  </th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {constraints.map(c => {
                  const unit = resolveUnitName(c)
                  const { day, time } = formatDayTime(c, periodMap)

                  return (
                    <tr key={c.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 leading-tight">{unit.name}</p>
                        {unit.code && (
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">{unit.code}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {day !== '—'
                          ? <span className="font-medium text-gray-700">{day}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-[13px] tabular-nums">
                        {time ? time : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                            title="Delete"
                          >
                            {deletingId === c.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {constraints.map(c => {
              const unit = resolveUnitName(c)
              const { day, time } = formatDayTime(c, periodMap)

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm flex items-start justify-between gap-3"
                >
                  {/* Left: info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-gray-800 text-sm leading-tight truncate">
                      {unit.name}
                    </p>
                    {unit.code && (
                      <p className="text-[11px] font-mono text-gray-400">{unit.code}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                      {day !== '—' && (
                        <span className="text-xs text-gray-500">
                          <span className="text-gray-400 mr-1">Day</span>
                          <span className="font-medium text-gray-700">{day}</span>
                        </span>
                      )}
                      {time && (
                        <span className="text-xs text-gray-500 tabular-nums">
                          <span className="text-gray-400 mr-1">Time</span>
                          <span className="font-medium text-gray-700">{time}</span>
                        </span>
                      )}
                      {day === '—' && !time && (
                        <span className="text-xs text-gray-300">No schedule set</span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions — always visible on mobile */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                      title="Delete"
                    >
                      {deletingId === c.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <ConstraintModal
        constraint={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}