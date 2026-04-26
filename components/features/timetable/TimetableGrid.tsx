'use client'

import { useMemo, useState } from 'react'
import type { ScheduledUnit, Period } from '@/types'
import { DAY_SHORT } from '@/types'
import EntryCard from './EntryCard'
import EntryEditModal from './EntryEditModal'
import type { Trainer, Room } from '@/types'

interface TimetableGridProps {
  entries: ScheduledUnit[]
  periods?: Period[]
  days?: string[]
  trainers?: Trainer[]
  rooms?: Room[]
  loading?: boolean
  readOnly?: boolean
}

export default function TimetableGrid({
  entries, periods = [], days = [], trainers = [], rooms = [], loading = false, readOnly = false,
}: TimetableGridProps) {
  const [selected, setSelected] = useState<ScheduledUnit | null>(null)

  const cohortColourMap = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    entries.forEach(e => {
      if (!map.has(e.cohort)) map.set(e.cohort, idx++)
    })
    return map
  }, [entries])

  const grid = useMemo(() => {
    const g: Record<string, Record<string, ScheduledUnit[]>> = {}
    entries.forEach(e => {
      if (!g[e.day]) g[e.day] = {}
      if (!g[e.day][e.period]) g[e.day][e.period] = []
      g[e.day][e.period].push(e)
    })
    return g
  }, [entries])

  const teachingPeriods = periods.filter(p => !p.is_break)

  const colCount = days.length + 1

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(120px, 1fr))` }}
        >
          {/* ── Header row ───────────────────────────────── */}
          <div className="border-b border-r border-gray-100 bg-gray-50 p-2" />

          {days.map(day => (
            <div
              key={day}
              className="border-b border-r border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide last:border-r-0"
            >
              {DAY_SHORT[day] ?? day}
            </div>
          ))}

          {/* ── Period rows ───────────────────────────────── */}
          {periods.map(period => {
            if (period.is_break) {
              return (
                <div key={period.id} className="contents">
                  <div className="border-b border-r border-gray-100 bg-gray-50 px-2 py-1.5 flex items-center">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{period.label}</span>
                  </div>
                  {days.map(day => (
                    <div
                      key={day}
                      className="border-b border-r border-gray-100 bg-gray-50/80 last:border-r-0 flex items-center justify-center"
                    >
                      <span className="text-[10px] text-gray-300 tracking-widest">— BREAK —</span>
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <div key={period.id} className="contents">
                <div className="border-b border-r border-gray-100 bg-gray-50 px-2 py-2 min-h-[90px]">
                  <p className="text-[11px] font-semibold text-gray-600">{period.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {period.start_time.slice(0, 5)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {period.end_time.slice(0, 5)}
                  </p>
                </div>

                {days.map(day => {
                  const cellEntries = grid[day]?.[period.id] ?? []
                  return (
                    <div
                      key={day}
                      className="border-b border-r border-gray-100 p-1.5 min-h-[90px] last:border-r-0 space-y-1"
                    >
                      {cellEntries.map(entry => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          colourIndex={cohortColourMap.get(entry.cohort) ?? 0}
                          onClick={readOnly ? undefined : (entry) => setSelected(entry)}
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
