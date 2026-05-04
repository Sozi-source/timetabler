'use client'

import { cn } from '@/lib/utils'
import type { Conflict } from '@/types'
import { CheckCircle, MinusCircle } from 'lucide-react'

const SEVERITY_STYLES: Record<string, string> = {
  HIGH:   'border-red-200 bg-red-50',
  MEDIUM: 'border-amber-200 bg-amber-50',
  LOW:    'border-blue-200 bg-blue-50',
}

const SEVERITY_DOT: Record<string, string> = {
  HIGH:   'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW:    'bg-blue-400',
}

const SEVERITY_BADGE: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700 ring-1 ring-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  LOW:    'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  RESOLVED:   'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  OVERRIDDEN: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  IGNORED:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

interface Props {
  conflict: Conflict
  onResolve: (conflict: Conflict) => void
}

export default function ConflictCard({ conflict, onResolve }: Props) {
  const isPending = conflict.resolution_status === 'PENDING'

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-3 transition-all hover:shadow-sm',
      SEVERITY_STYLES[conflict.severity] ?? 'border-gray-200 bg-white',
    )}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity dot + badge */}
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            SEVERITY_BADGE[conflict.severity],
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[conflict.severity])} />
            {conflict.severity}
          </span>

          {/* Conflict type chip */}
          <span className="text-[10px] font-semibold text-gray-500 bg-white/70 rounded-md px-2 py-0.5 ring-1 ring-gray-200 font-mono">
            {conflict.conflict_type}
          </span>

          {/* Status badge */}
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
            STATUS_BADGE[conflict.resolution_status] ?? STATUS_BADGE.PENDING,
          )}>
            {conflict.resolution_status}
          </span>
        </div>

        {isPending && (
          <button
            onClick={() => onResolve(conflict)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-[.97] ring-0 hover:border-gray-300"
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            Resolve
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-800 leading-relaxed">{conflict.description}</p>

      {/* Involved entities */}
      {conflict.involved_entries && conflict.involved_entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {conflict.involved_entries.map((entry: string, i: number) => (
            <span
              key={i}
              className="rounded-lg bg-white/80 border border-gray-200 px-2 py-0.5 text-xs text-gray-600 font-mono ring-0"
            >
              {entry}
            </span>
          ))}
        </div>
      )}

      {/* Resolution note */}
      {conflict.resolution_note && (
        <div className="flex items-start gap-2 rounded-xl bg-white/60 border border-gray-200 px-3 py-2.5">
          <MinusCircle className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600 leading-relaxed">{conflict.resolution_note}</p>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-gray-400 font-mono">
        Detected {new Date(conflict.created_at).toLocaleDateString('en-KE', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  )
}