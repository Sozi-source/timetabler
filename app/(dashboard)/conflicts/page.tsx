'use client'

import { useState } from 'react'
import { useTermStore } from '@/store'
import { useConflicts } from '@/hooks/useTimetable'
import ConflictCard from '@/components/features/conflicts/ConflictCard'
import ResolveModal from '@/components/features/conflicts/ResolveModal'
import type { Conflict } from '@/types'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
type StatusFilter  = 'ALL' | 'PENDING' | 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED'

const SEVERITY_OPTS: SeverityFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const STATUS_OPTS: StatusFilter[]     = ['ALL', 'PENDING', 'RESOLVED', 'OVERRIDDEN', 'IGNORED']

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

  // Sort: HIGH first, then MEDIUM, LOW
  const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const sorted = [...filtered].sort(
    (a, b) => (ORDER[a.severity as keyof typeof ORDER] ?? 3) - (ORDER[b.severity as keyof typeof ORDER] ?? 3)
  )

  const pending = conflicts.filter(c => c.resolution_status === 'PENDING')

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conflicts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? 'No term selected'} · {conflicts.length} total · {pending.length} pending
          </p>
        </div>
      </div>

      {/* No conflicts banner */}
      {!isLoading && termId && conflicts.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">No conflicts detected for this term.</p>
        </div>
      )}

      {/* No term */}
      {!termId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-amber-800">Select a term from the top bar to view conflicts</p>
        </div>
      )}

      {termId && conflicts.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">

            {/* Severity */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Severity</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {SEVERITY_OPTS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={
                      severityFilter === s
                        ? 'px-3 py-1.5 text-xs font-semibold bg-[#1e3a5f] text-white'
                        : 'px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50'
                    }
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                {STATUS_OPTS.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            {/* Counts */}
            <div className="ml-auto flex gap-2 text-xs">
              <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-medium">
                {conflicts.filter(c => c.severity === 'HIGH').length} high
              </span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 font-medium">
                {conflicts.filter(c => c.severity === 'MEDIUM').length} medium
              </span>
              <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 font-medium">
                {conflicts.filter(c => c.severity === 'LOW').length} low
              </span>
            </div>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-gray-100" />
              ))}
            </div>
          )}

          {/* Empty filter result */}
          {!isLoading && sorted.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conflicts match the current filters.</p>
            </div>
          )}

          {/* Conflict list */}
          {!isLoading && sorted.length > 0 && (
            <div className="space-y-3">
              {sorted.map(conflict => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={setSelected}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Resolve modal */}
      <ResolveModal
        conflict={selected}
        termId={termId}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
