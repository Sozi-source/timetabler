'use client'

import { cn } from '@/lib/utils'
import type { ScheduledUnit } from '@/types'

// 10 distinct cohort colours — assigned by cohort index in grid
const COHORT_COLOURS = [
  'bg-blue-50   border-blue-200   text-blue-900',
  'bg-violet-50 border-violet-200 text-violet-900',
  'bg-teal-50   border-teal-200   text-teal-900',
  'bg-orange-50 border-orange-200 text-orange-900',
  'bg-pink-50   border-pink-200   text-pink-900',
  'bg-cyan-50   border-cyan-200   text-cyan-900',
  'bg-lime-50   border-lime-200   text-lime-900',
  'bg-rose-50   border-rose-200   text-rose-900',
  'bg-indigo-50 border-indigo-200 text-indigo-900',
  'bg-amber-50  border-amber-200  text-amber-900',
]

const STATUS_DOT: Record<string, string> = {
  DRAFT:     'bg-amber-400',
  PUBLISHED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
}

interface EntryCardProps {
  entry: ScheduledUnit
  colourIndex: number
  onClick: (entry: ScheduledUnit) => void
}

export default function EntryCard({ entry, colourIndex, onClick }: EntryCardProps) {
  const colour = COHORT_COLOURS[colourIndex % COHORT_COLOURS.length]

  return (
    <button
      onClick={() => onClick(entry)}
      className={cn(
        'fit-card w-full text-left rounded-md border p-1.5 text-xs transition-opacity hover:opacity-80 active:scale-[0.98]',
        colour,
        entry.status === 'CANCELLED' && 'opacity-50 line-through'
      )}
    >
      {/* Status dot + unit code */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[entry.status])} />
        <span className="font-semibold truncate">{entry.unit_name}</span>
        {entry.is_combined && (
          <span className="ml-auto shrink-0 rounded px-1 bg-white/60 text-[10px] font-medium">
            Combined
          </span>
        )}
      </div>
      <p className="truncate text-[10px] opacity-60 font-mono">{entry.unit_code}</p><p className="truncate text-[11px] opacity-80">{entry.cohort_name}</p>
      <p className="truncate text-[11px] opacity-70">{entry.trainer_name}</p>
      <p className="truncate text-[11px] opacity-60">{entry.room_code}</p>
    </button>
  )
}
