'use client'

import { useState } from 'react'
import { useTermStore } from '@/store'
import { useConflicts } from '@/hooks/useTimetable'
import ConflictCard from '@/components/features/conflicts/ConflictCard'
import ResolveModal from '@/components/features/conflicts/ResolveModal'
import type { Conflict } from '@/types'
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldOff, ShieldCheck, Info } from 'lucide-react'

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
type StatusFilter  = 'ALL' | 'PENDING' | 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED'

const SEVERITY_OPTS: SeverityFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const STATUS_OPTS: StatusFilter[]     = ['ALL', 'PENDING', 'RESOLVED', 'OVERRIDDEN', 'IGNORED']

const SEVERITY_STYLE: Record<Exclude<SeverityFilter, 'ALL'>, {
  bar: string; badge: string; dot: string
}> = {
  HIGH:   { bar: 'bg-red-500',   badge: 'bg-red-100 text-red-700 ring-red-200',       dot: 'bg-red-500'   },
  MEDIUM: { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700 ring-amber-200', dot: 'bg-amber-400' },
  LOW:    { bar: 'bg-blue-400',  badge: 'bg-blue-100 text-blue-700 ring-blue-200',    dot: 'bg-blue-400'  },
}

export default function ConflictsPage() {
  const { activeTerm } = useTermStore()
  const termId = activeTerm?.id ?? ''

  const { data: conflicts = [], isLoading } = useConflicts(termId)

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('PENDING')
  const [selected,       setSelected]       = useState<Conflict | null>(null)

  const filtered = conflicts.filter(c => {
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false
    if (statusFilter   !== 'ALL' && c.resolution_status !== statusFilter) return false
    return true
  })

  const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const sorted = [...filtered].sort(
    (a, b) => (ORDER[a.severity as keyof typeof ORDER] ?? 3) - (ORDER[b.severity as keyof typeof ORDER] ?? 3)
  )

  const pending   = conflicts.filter(c => c.resolution_status === 'PENDING')
  const highCount = conflicts.filter(c => c.severity === 'HIGH').length
  const medCount  = conflicts.filter(c => c.severity === 'MEDIUM').length
  const lowCount  = conflicts.filter(c => c.severity === 'LOW').length

  return (
    <div className="space-y-5">

      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Conflicts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? 'No term selected'}
            {conflicts.length > 0 && (
              <>
                {' · '}
                <span className="font-medium text-gray-700">{conflicts.length}</span> total
                {' · '}
                <span className={pending.length > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}>
                  {pending.length} pending
                </span>
              </>
            )}
          </p>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-center gap-2">
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
              const count = sev === 'HIGH' ? highCount : sev === 'MEDIUM' ? medCount : lowCount
              const s = SEVERITY_STYLE[sev]
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(prev => prev === sev ? 'ALL' : sev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all select-none ${s.badge} ${
                    severityFilter === sev ? 'ring-2 scale-105' : 'ring-transparent hover:ring-1'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${s.dot}`} />
                  {count} {sev.charAt(0) + sev.slice(1).toLowerCase()}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── No term notice ────────────────────────────────── */}
      {!termId && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">Select a term from the top bar to view conflicts</p>
        </div>
      )}

      {/* ── All-clear ─────────────────────────────────────── */}
      {!isLoading && termId && conflicts.length === 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">No conflicts detected</p>
            <p className="text-xs text-emerald-600 mt-0.5">This term is clear and ready to publish</p>
          </div>
        </div>
      )}

      {termId && conflicts.length > 0 && (
        <>
          {/* ── Filter bar ────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            {/* Severity segmented control */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {SEVERITY_OPTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all select-none ${
                    severityFilter === s
                      ? 'bg-[#1e3a5f] text-white'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
            >
              {STATUS_OPTS.map(s => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {/* ── Loading skeleton ──────────────────────────── */}
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-gray-100" />
              ))}
            </div>
          )}

          {/* ── Empty filter result ───────────────────────── */}
          {!isLoading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                <ShieldOff className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No conflicts match these filters</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting severity or status</p>
            </div>
          )}

          {/* ── Conflict list ─────────────────────────────── */}
          {!isLoading && sorted.length > 0 && (
            <div className="space-y-2.5">
              {sorted.map(conflict => {
                const sev = conflict.severity as Exclude<SeverityFilter, 'ALL'>
                const style = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.LOW
                const isDimmed = conflict.resolution_status !== 'PENDING'

                return (
                  <div
                    key={conflict.id}
                    className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-px ${
                      isDimmed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${style.bar}`} />
                    <div className="pl-4">
                      <ConflictCard conflict={conflict} onResolve={setSelected} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <ResolveModal conflict={selected} termId={termId} onClose={() => setSelected(null)} />
    </div>
  )
}