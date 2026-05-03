'use client'

import { cn } from '@/lib/utils'
import type { Conflict } from '@/types'
import { AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react'

const SEVERITY_STYLES: Record<string, string> = {
  HIGH:   'border-red-200 bg-red-50',
  MEDIUM: 'border-amber-200 bg-amber-50',
  LOW:    'border-blue-200 bg-blue-50',
}
const SEVERITY_BADGE: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-blue-100 text-blue-700',
}
const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-gray-100 text-gray-600',
  RESOLVED:   'bg-emerald-100 text-emerald-700',
  OVERRIDDEN: 'bg-violet-100 text-violet-700',
  IGNORED:    'bg-slate-100 text-slate-600',
}

interface Props {
  conflict: Conflict
  onResolve: (conflict: Conflict) => void
}

export default function ConflictCard({ conflict, onResolve }: Props) {
  const isPending = conflict.resolution_status === 'PENDING'

  return (
    <div className={cn('conflict-card fit-card rounded-xl border p-4 space-y-3', SEVERITY_STYLES[conflict.severity] ?? 'border-gray-200 bg-white')}>

      {/* Top row */}
      <div className="conflict-actions flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', SEVERITY_BADGE[conflict.severity])}>
            {conflict.severity}
          </span>
          <span className="text-xs font-medium text-gray-700 bg-white/70 rounded-full px-2.5 py-0.5 border border-gray-200">
            {conflict.conflict_type}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_BADGE[conflict.resolution_status])}>
            {conflict.resolution_status}
          </span>
        </div>

        {isPending && (
          <button
            onClick={() => onResolve(conflict)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            Resolve
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-800">{conflict.description}</p>

      {/* Involved entities */}
      {conflict.involved_entries && conflict.involved_entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {conflict.involved_entries.map((entry: string, i: number) => (
            <span key={i} className="rounded-md bg-white/80 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
              {entry}
            </span>
          ))}
        </div>
      )}

      {/* Resolution note */}
      {conflict.resolution_note && (
        <div className="flex items-start gap-2 rounded-lg bg-white/60 border border-gray-200 px-3 py-2">
          <MinusCircle className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">{conflict.resolution_note}</p>
        </div>
      )}

      {/* Footer */}
      <p className="text-[11px] text-gray-400">
        Detected {new Date(conflict.created_at).toLocaleDateString('en-KE', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  )
}
