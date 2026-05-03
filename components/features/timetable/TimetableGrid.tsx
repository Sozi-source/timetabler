'use client'

import { useMemo, useState } from 'react'
import type { ScheduledUnit, Period, TimetableGrid as TimetableGridType } from '@/types'
import { DAY_SHORT } from '@/types'
import EntryCard from './EntryCard'
import EntryEditModal from './EntryEditModal'
import type { Trainer, Room } from '@/types'

interface TimetableGridProps {
  grid?: TimetableGridType
  entries?: ScheduledUnit[]
  periods?: Period[]
  days?: string[]
  trainers?: Trainer[]
  rooms?: Room[]
  termId?: string
  status?: string
  loading?: boolean
  readOnly?: boolean
}

export default function TimetableGrid({
  grid: gridProp,
  entries: entriesProp,
  periods = [],
  days = [],
  trainers = [],
  rooms = [],
  loading = false,
  readOnly = false,
}: TimetableGridProps) {
  const [selected, setSelected] = useState<ScheduledUnit | null>(null)

  const entries = useMemo<ScheduledUnit[]>(() => {
    if (entriesProp) return entriesProp
    if (!gridProp) return []
    const out: ScheduledUnit[] = []
    for (const daySlots of Object.values(gridProp))
      for (const slotEntries of Object.values(daySlots))
        out.push(...slotEntries)
    return out
  }, [entriesProp, gridProp])

  const cohortColourMap = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    entries.forEach(e => {
      const key = e.cohort ?? ''
      if (key && !map.has(key)) map.set(key, idx++)
    })
    return map
  }, [entries])

  const grid = useMemo<TimetableGridType>(() => {
    if (gridProp) return gridProp
    const g: TimetableGridType = {}
    entries.forEach(e => {
      if (!g[e.day]) g[e.day] = {}
      if (!g[e.day][String(e.period)]) g[e.day][String(e.period)] = []
      g[e.day][String(e.period)].push(e)
    })
    return g
  }, [gridProp, entries])

  const teachingPeriods = periods.filter(p => !p.is_break)

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 sm:h-20 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Outer wrapper — horizontal scroll on small screens */}
      <div className="w-full overflow-x-auto rounded-xl border-2 border-[#1e3a5f]/20 bg-white shadow-md">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, minmax(100px, 1fr))`,
            minWidth: `${64 + days.length * 100}px`,
          }}
        >
          {/* ── Header row ── */}

          {/* Corner cell */}
          <div className="border-b-2 border-r-2 border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-2" />

          {/* Day headers */}
          {days.map((day, di) => (
            <div
              key={day}
              className={[
                'border-b-2 border-[#1e3a5f]/20 bg-[#1e3a5f]/5',
                'px-2 sm:px-3 py-2 text-center',
                'text-[10px] sm:text-xs font-bold text-[#1e3a5f] uppercase tracking-widest',
                di < days.length - 1 ? 'border-r border-[#1e3a5f]/10' : '',
              ].join(' ')}
            >
              {DAY_SHORT[day] ?? day}
            </div>
          ))}

          {/* ── Period rows ── */}
          {periods.map((period, pi) => {
            const isLastPeriod = pi === periods.length - 1

            if (period.is_break) {
              return (
                <div key={period.id} className="contents">
                  {/* Break label cell */}
                  <div className={[
                    'border-r-2 border-[#1e3a5f]/20 bg-amber-50/60 px-2 py-1.5 flex items-center',
                    !isLastPeriod ? 'border-b border-amber-200/60' : '',
                  ].join(' ')}>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                      {period.label}
                    </span>
                  </div>

                  {/* Break span cells */}
                  {days.map((day, di) => (
                    <div
                      key={day}
                      className={[
                        'bg-amber-50/40 flex items-center justify-center',
                        !isLastPeriod ? 'border-b border-amber-200/40' : '',
                        di < days.length - 1 ? 'border-r border-amber-200/30' : '',
                      ].join(' ')}
                    >
                      <span className="text-[9px] sm:text-[10px] text-amber-300 tracking-widest font-medium">
                        BREAK
                      </span>
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <div key={period.id} className="contents">
                {/* Period label cell */}
                <div className={[
                  'border-r-2 border-[#1e3a5f]/20 bg-[#1e3a5f]/[0.03] px-2 py-2 min-h-[80px] sm:min-h-[96px]',
                  !isLastPeriod ? 'border-b border-[#1e3a5f]/10' : '',
                ].join(' ')}>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#1e3a5f]/70 leading-tight">
                    {period.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1 tabular-nums">
                    {period.start_time?.slice(0, 5)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 tabular-nums">
                    {period.end_time?.slice(0, 5)}
                  </p>
                </div>

                {/* Entry cells */}
                {days.map((day, di) => {
                  const cellEntries = grid[day]?.[String(period.id)] ?? []
                  const hasEntries  = cellEntries.length > 0

                  return (
                    <div
                      key={day}
                      className={[
                        'p-1 sm:p-1.5 min-h-[80px] sm:min-h-[96px] space-y-1 transition-colors',
                        hasEntries ? 'bg-white' : 'bg-gray-50/40 hover:bg-gray-50',
                        !isLastPeriod ? 'border-b border-[#1e3a5f]/10' : '',
                        di < days.length - 1 ? 'border-r border-[#1e3a5f]/10' : '',
                        // Accent left border on cells that have entries
                        hasEntries ? 'relative' : '',
                      ].join(' ')}
                    >
                      {cellEntries.map(entry => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          colourIndex={(cohortColourMap.get(entry.cohort ?? '') ?? 0) % 10}
                          onClick={(e) => { if (!readOnly) setSelected(e) }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <EntryEditModal
        entry={selected}
        trainers={trainers}
        rooms={rooms}
        periods={teachingPeriods}
        onClose={() => setSelected(null)}
      />
    </>
  )
}