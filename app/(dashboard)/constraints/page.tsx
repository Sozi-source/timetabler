'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConstraints, useTrainers, useCohorts, useRooms, usePeriods } from '@/hooks/useSetup'
import { queryKeys, DAY_LABELS } from '@/types'
import type { Constraint, ConstraintScope, ConstraintRule, Period } from '@/types'
import { deleteConstraint } from '@/services/setup'
import ConstraintModal from '@/components/features/constraints/ConstraintModal'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Badges ──────────────────────────────────────────────────────────────────
const SCOPE_BADGE: Record<ConstraintScope, string> = {
  UNIT:    'bg-slate-100 text-slate-700 ring-slate-200',
  TRAINER: 'bg-blue-100 text-blue-700 ring-blue-200',
  COHORT:  'bg-violet-100 text-violet-700 ring-violet-200',
  ROOM:    'bg-teal-100 text-teal-700 ring-teal-200',
}

const RULE_LABEL: Record<ConstraintRule, string> = {
  PIN_DAY_PERIOD: 'Pin day & period',
  PIN_DAY:        'Pin day',
  PREFERRED_ROOM: 'Preferred room',
  AVOID_DAY:      'Avoid day',
  AVOID_PERIOD:   'Avoid period',
  BACK_TO_BACK:   'Back-to-back',
  MAX_PER_DAY:    'Max per day',
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(t?: string) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatParameters(
  c: Constraint,
  periodMap: Map<string, Period>,
  roomMap:   Map<string, string>,
): string {
  const p = c.parameters
  const parts: string[] = []

  const day = p.day as string | undefined
  if (day) parts.push(DAY_LABELS[day] ?? day)

  const periodId = p.period_id as string | undefined
  if (periodId) {
    const period = periodMap.get(periodId)
    if (period) {
      const start = formatTime(period.start_time || period.start)
      const end   = formatTime(period.end_time   || period.end)
      parts.push(`${period.label} (${start}–${end})`)
    }
  }

  const avoidDays = p.avoid_days as string[] | undefined
  if (avoidDays?.length) parts.push(avoidDays.map(d => DAY_LABELS[d] ?? d).join(', '))

  const roomId = p.room_id as string | undefined
  if (roomId) parts.push(roomMap.get(roomId) ?? roomId)

  const preferredRoom = p.preferred_room as string | undefined
  if (preferredRoom) parts.push(roomMap.get(preferredRoom) ?? preferredRoom)

  const max = p.max as number | undefined
  if (max !== undefined) parts.push(`Max ${max}/day`)

  return parts.length ? parts.join(' · ') : '—'
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ConstraintsPage() {
  const qc = useQueryClient()

  const { data: constraintsRaw = [], isLoading } = useConstraints()
  const { data: trainers = [] } = useTrainers()
  const { data: cohorts  = [] } = useCohorts()
  const { data: rooms    = [] } = useRooms()
  const { data: periodsRaw } = usePeriods()
  const periods: Period[] = Array.isArray(periodsRaw) ? periodsRaw : []

  const constraints: Constraint[] = Array.isArray(constraintsRaw)
    ? constraintsRaw
    : ((constraintsRaw as { data?: Constraint[] })?.data ?? [])

  const trainerMap = new Map<string, string>(
    (trainers as { id: string; first_name: string; last_name: string }[])
      .map(t => [t.id, `${t.first_name} ${t.last_name}`.trim()])
  )
  const cohortMap = new Map<string, string>(
    (cohorts as { id: string; name: string }[]).map(c => [c.id, c.name])
  )
  const roomMap = new Map<string, string>(
    (rooms as { id: string; name: string }[]).map(r => [r.id, r.name])
  )
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

  function resolveTarget(c: Constraint): { name: string; sub: string | null } {
    if (c.curriculum_unit) return { name: c.unit_name ?? '—', sub: c.unit_code ?? null }
    if (c.trainer) return { name: trainerMap.get(c.trainer) ?? '—', sub: null }
    if (c.cohort)  return { name: cohortMap.get(c.cohort)   ?? '—', sub: null }
    if (c.room)    return { name: roomMap.get(c.room)       ?? '—', sub: null }
    return { name: '—', sub: null }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Constraints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#162d4a] active:scale-[.98] transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Add constraint
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="animate-pulse space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!isLoading && constraints.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <ShieldCheck className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No constraints defined yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a constraint to restrict timetable generation</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add first constraint
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────── */}
      {!isLoading && constraints.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Scope</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Target</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rule</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Day / Time</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Strength</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {constraints.map(c => {
                const target = resolveTarget(c)
                const params = formatParameters(c, periodMap, roomMap)

                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors group">

                    {/* Scope */}
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                        SCOPE_BADGE[c.scope]
                      )}>
                        {c.scope.charAt(0) + c.scope.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-5 py-3.5 max-w-[180px]">
                      <p className="font-semibold text-gray-800 leading-tight truncate text-sm">{target.name}</p>
                      {target.sub && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{target.sub}</p>
                      )}
                      {c.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic truncate">{c.notes}</p>
                      )}
                    </td>

                    {/* Rule */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <code className="text-xs text-gray-600 bg-gray-100 rounded-lg px-2 py-1 font-mono">
                        {RULE_LABEL[c.rule] ?? c.rule}
                      </code>
                    </td>

                    {/* Day / Time */}
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                      {params !== '—' ? params : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Hard / Soft */}
                    <td className="px-5 py-3.5">
                      {c.is_hard ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          <Lock className="h-3 w-3" />Hard
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                          <Unlock className="h-3 w-3" />Soft
                        </span>
                      )}
                    </td>

                    {/* Active */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        'inline-block h-2.5 w-2.5 rounded-full ring-2',
                        c.is_active
                          ? 'bg-emerald-500 ring-emerald-100'
                          : 'bg-gray-300 ring-gray-100'
                      )} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
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
      )}

      <ConstraintModal
        constraint={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}