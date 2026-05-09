'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import type { ScheduledUnit, Period, TimetableGrid as TimetableGridType } from '@/types'
import { DAY_SHORT } from '@/types'
import EntryCard from './EntryCard'
import EntryEditModal from './EntryEditModal'
import type { Trainer, Room } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

// ── Colour palette for cohorts ────────────────────────────────────────────────
const COHORT_COLOURS = [
  { bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400',   text: 'text-blue-700'   },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400', text: 'text-violet-700' },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400',  text: 'text-amber-700'  },
  { bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-400',   text: 'text-rose-700'   },
  { bg: 'bg-cyan-50',   border: 'border-cyan-200',   dot: 'bg-cyan-400',   text: 'text-cyan-700'   },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', dot: 'bg-fuchsia-400', text: 'text-fuchsia-700' },
  { bg: 'bg-lime-50',   border: 'border-lime-200',   dot: 'bg-lime-400',   text: 'text-lime-700'   },
  { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', text: 'text-orange-700' },
  { bg: 'bg-teal-50',   border: 'border-teal-200',   dot: 'bg-teal-400',   text: 'text-teal-700'   },
]

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
  const [selected, setSelected]     = useState<ScheduledUnit | null>(null)
  const [activeDay, setActiveDay]   = useState<string>(days[0] ?? '')
  const dayTabsRef                  = useRef<HTMLDivElement>(null)

  // Keep activeDay in sync when days prop changes
  useEffect(() => {
    if (days.length > 0 && !days.includes(activeDay)) {
      setActiveDay(days[0])
    }
  }, [days, activeDay])

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

  // Day entry counts for badge
  const dayEntryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const day of days) {
      let count = 0
      for (const period of teachingPeriods) {
        count += (grid[day]?.[String(period.id)] ?? []).length
      }
      counts[day] = count
    }
    return counts
  }, [grid, days, teachingPeriods])

  const activeDayIndex = days.indexOf(activeDay)

  function goNextDay() {
    if (activeDayIndex < days.length - 1) setActiveDay(days[activeDayIndex + 1])
  }
  function goPrevDay() {
    if (activeDayIndex > 0) setActiveDay(days[activeDayIndex - 1])
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-pulse space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="h-8 w-full rounded-lg bg-[#1e3a5f]/8 mb-3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 sm:h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ── MOBILE VIEW (< lg) ── Day-tab agenda ─────────────────────────── */}
      <div className="block lg:hidden">
        <div className="rounded-2xl border border-[#1e3a5f]/15 bg-white shadow-md overflow-hidden">

          {/* Day tab strip */}
          <div className="border-b border-[#1e3a5f]/10 bg-[#1e3a5f]/[0.03]">
            <div className="flex items-center gap-1 px-2 py-2" ref={dayTabsRef}>
              {/* Prev arrow */}
              <button
                onClick={goPrevDay}
                disabled={activeDayIndex === 0}
                className="shrink-0 p-1.5 rounded-lg text-[#1e3a5f]/40 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Day tabs */}
              <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-none">
                {days.map(day => {
                  const isActive  = day === activeDay
                  const count     = dayEntryCounts[day] ?? 0
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={[
                        'flex-1 min-w-[48px] flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-center',
                        isActive
                          ? 'bg-[#1e3a5f] text-white shadow-sm'
                          : 'text-[#1e3a5f]/60 hover:bg-[#1e3a5f]/5',
                      ].join(' ')}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {DAY_SHORT[day] ?? day}
                      </span>
                      {count > 0 && (
                        <span className={[
                          'text-[9px] font-bold rounded-full px-1.5 py-0 leading-4',
                          isActive ? 'bg-white/20 text-white' : 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
                        ].join(' ')}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Next arrow */}
              <button
                onClick={goNextDay}
                disabled={activeDayIndex === days.length - 1}
                className="shrink-0 p-1.5 rounded-lg text-[#1e3a5f]/40 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 disabled:opacity-20 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Agenda list for active day */}
          <div className="divide-y divide-[#1e3a5f]/6">
            {periods.map(period => {
              const cellEntries = grid[activeDay]?.[String(period.id)] ?? []

              if (period.is_break) {
                return (
                  <div key={period.id} className="flex items-center gap-3 px-4 py-2 bg-amber-50/60">
                    <div className="w-14 shrink-0">
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Break</p>
                    </div>
                    <div className="flex-1 flex items-center">
                      <div className="h-px flex-1 border-t border-dashed border-amber-200" />
                      <span className="mx-2 text-[10px] text-amber-400 font-semibold">{period.label}</span>
                      <div className="h-px flex-1 border-t border-dashed border-amber-200" />
                    </div>
                  </div>
                )
              }

              return (
                <div key={period.id} className="flex gap-0 min-h-[72px]">
                  {/* Time column */}
                  <div className="w-16 shrink-0 flex flex-col justify-center items-center px-2 py-3 bg-[#1e3a5f]/[0.025] border-r border-[#1e3a5f]/8">
                    <p className="text-[10px] font-bold text-[#1e3a5f]/50 leading-tight text-center">
                      {period.label}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono mt-1 tabular-nums">
                      {period.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-[9px] text-gray-300 font-mono tabular-nums">
                      {period.end_time?.slice(0, 5)}
                    </p>
                  </div>

                  {/* Entry cards */}
                  <div className="flex-1 p-2 space-y-1.5 min-h-[72px]">
                    {cellEntries.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 font-medium">Free</span>
                      </div>
                    ) : (
                      cellEntries.map(entry => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          colourIndex={(cohortColourMap.get(entry.cohort ?? '') ?? 0) % 10}
                          onClick={e => { if (!readOnly) setSelected(e) }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Swipe hint */}
          <div className="px-4 py-2 border-t border-[#1e3a5f]/6 bg-[#1e3a5f]/[0.02] flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {activeDayIndex + 1} of {days.length} days
            </p>
            <div className="flex gap-1">
              {days.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={[
                    'h-1.5 rounded-full transition-all',
                    day === activeDay ? 'w-4 bg-[#1e3a5f]' : 'w-1.5 bg-gray-200',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP VIEW (>= lg) ── Full grid ────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="w-full overflow-x-auto rounded-2xl border border-[#1e3a5f]/15 bg-white shadow-md ring-1 ring-black/[0.03]">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(110px, 1fr))`,
              minWidth: `${72 + days.length * 110}px`,
            }}
          >
            {/* Corner cell */}
            <div className="border-b-2 border-r-2 border-[#1e3a5f]/15 bg-[#1e3a5f]/[0.04] p-2" />

            {/* Day headers */}
            {days.map((day, di) => (
              <div
                key={day}
                className={[
                  'border-b-2 border-[#1e3a5f]/15 bg-[#1e3a5f]/[0.04]',
                  'px-3 py-2.5 text-center',
                  'text-[11px] font-bold text-[#1e3a5f] uppercase tracking-widest',
                  di < days.length - 1 ? 'border-r border-[#1e3a5f]/10' : '',
                ].join(' ')}
              >
                <span>{DAY_SHORT[day] ?? day}</span>
                {dayEntryCounts[day] > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-[9px] font-bold">
                    {dayEntryCounts[day]}
                  </span>
                )}
              </div>
            ))}

            {/* Period rows */}
            {periods.map((period, pi) => {
              const isLast = pi === periods.length - 1

              if (period.is_break) {
                return (
                  <div key={period.id} className="contents">
                    <div className={[
                      'border-r-2 border-[#1e3a5f]/15 bg-amber-50/70 px-2 py-1.5 flex items-center',
                      !isLast ? 'border-b border-amber-200/50' : '',
                    ].join(' ')}>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                        {period.label}
                      </span>
                    </div>
                    {days.map((day, di) => (
                      <div
                        key={day}
                        className={[
                          'bg-amber-50/40 flex items-center justify-center py-2',
                          !isLast ? 'border-b border-amber-200/40' : '',
                          di < days.length - 1 ? 'border-r border-amber-200/25' : '',
                        ].join(' ')}
                      >
                        <span className="text-[9px] text-amber-300/80 tracking-widest font-semibold uppercase">
                          break
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }

              return (
                <div key={period.id} className="contents">
                  <div className={[
                    'border-r-2 border-[#1e3a5f]/15 bg-[#1e3a5f]/[0.025]',
                    'px-2 py-2.5 min-h-[104px]',
                    !isLast ? 'border-b border-[#1e3a5f]/8' : '',
                  ].join(' ')}>
                    <p className="text-[11px] font-bold text-[#1e3a5f]/60 leading-tight">{period.label}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 tabular-nums font-mono">
                      {period.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-[10px] text-gray-300 tabular-nums font-mono">
                      {period.end_time?.slice(0, 5)}
                    </p>
                  </div>

                  {days.map((day, di) => {
                    const cellEntries = grid[day]?.[String(period.id)] ?? []
                    const hasEntries  = cellEntries.length > 0
                    return (
                      <div
                        key={day}
                        className={[
                          'p-1.5 min-h-[104px] space-y-1 transition-colors',
                          hasEntries ? 'bg-white' : 'bg-gray-50/30 hover:bg-gray-50/60',
                          !isLast ? 'border-b border-[#1e3a5f]/8' : '',
                          di < days.length - 1 ? 'border-r border-[#1e3a5f]/8' : '',
                        ].join(' ')}
                      >
                        {cellEntries.map(entry => (
                          <EntryCard
                            key={entry.id}
                            entry={entry}
                            colourIndex={(cohortColourMap.get(entry.cohort ?? '') ?? 0) % 10}
                            onClick={e => { if (!readOnly) setSelected(e) }}
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