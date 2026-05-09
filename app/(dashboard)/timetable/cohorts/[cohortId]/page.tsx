'use client'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useTerms, useCohorts } from '@/hooks/useSetup'
import { useCohortTimetable } from '@/hooks/useTimetable'
import { ArrowLeft, AlertCircle, Clock, Users, BookOpen, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_LABELS } from '@/types'
import type { Period, ScheduledUnit } from '@/types'

// Shape returned by GET /api/timetable/cohort/<id>/?term=<id>
interface CohortTimetableResponse {
  cohort: string
  cohort_name: string
  term: string
  periods: Period[]
  days: string[]
  // grid[day][period_id] = ScheduledUnit | null
  grid: Record<string, Record<string, ScheduledUnit | null>>
}

const UNIT_COLOURS = [
  'bg-sky-100 border-sky-300 text-sky-900',
  'bg-violet-100 border-violet-300 text-violet-900',
  'bg-emerald-100 border-emerald-300 text-emerald-900',
  'bg-amber-100 border-amber-300 text-amber-900',
  'bg-rose-100 border-rose-300 text-rose-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
  'bg-teal-100 border-teal-300 text-teal-900',
  'bg-orange-100 border-orange-300 text-orange-900',
]

export default function CohortTimetablePage({
  params,
}: {
  params: Promise<{ cohortId: string }>
}) {
  const { cohortId } = use(params)
  const router = useRouter()

  const { data: terms = [] } = useTerms()
  const { data: cohorts = [] } = useCohorts()
  const { activeTerm, setActiveTerm } = useTermStore()

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const active = terms.find((t) => t.is_current) ?? terms[terms.length - 1]
      if (active) setActiveTerm(active)
    }
  }, [terms, activeTerm, setActiveTerm])

  const termId = activeTerm?.id ?? ''
  const cohort = cohorts.find((c) => c.id === cohortId)

  const { data, isLoading, isError, error } = useCohortTimetable(cohortId, termId)
  const ttData = data as CohortTimetableResponse | undefined

  // Build unit_code → colour map
  const unitColourMap: Record<string, string> = {}
  let colourIdx = 0
  if (ttData?.grid) {
    for (const dayRow of Object.values(ttData.grid)) {
      for (const entry of Object.values(dayRow)) {
        if (entry && !(entry.unit_code in unitColourMap)) {
          unitColourMap[entry.unit_code] = UNIT_COLOURS[colourIdx % UNIT_COLOURS.length]
          colourIdx++
        }
      }
    }
  }

  const periods = ttData?.periods ?? []
  const days = ttData?.days ?? []
  const grid = ttData?.grid ?? {}

  const totalSessions = days.reduce(
    (acc, day) => acc + periods.filter((p) => grid[day]?.[p.id] != null).length,
    0
  )

  return (
    <div className="px-4 py-6 max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/timetable/cohorts')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Cohorts
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">
          {cohort?.name ?? ttData?.cohort_name ?? 'Timetable'}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {cohort?.name ?? ttData?.cohort_name ?? 'Cohort Timetable'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeTerm ? activeTerm.name : 'Loading term…'}
            {totalSessions > 0 && ` · ${totalSessions} sessions`}
          </p>
        </div>
        {!termId && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-md">
            No active term selected
          </span>
        )}
      </div>

      {/* No term warning */}
      {!termId && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No active term found. Please set an active term from the dashboard.
        </div>
      )}

      {/* Loading */}
      {isLoading && termId && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            <span className="text-sm">Loading timetable…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {(error as Error)?.message ?? 'Failed to load timetable. Please try again.'}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && termId && (
        <>
          {totalSessions === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No sessions scheduled</p>
              <p className="text-xs mt-1">Generate or publish a timetable for this term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 border-r border-slate-200">
                      Period
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-r border-slate-200 last:border-r-0"
                      >
                        {DAY_LABELS[day] ?? day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period: Period, pi: number) => (
                    <tr
                      key={period.id}
                      className={cn(
                        'border-b border-slate-200 last:border-b-0',
                        pi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      )}
                    >
                      {/* Period label */}
                      <td className="py-3 px-4 border-r border-slate-200 align-top">
                        <p className="font-medium text-slate-700 text-xs">{period.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {period.start_time}–{period.end_time}
                        </p>
                      </td>

                      {/* Day cells */}
                      {days.map((day) => {
                        const entry: ScheduledUnit | null = grid[day]?.[period.id] ?? null
                        return (
                          <td
                            key={day}
                            className="py-2 px-2 border-r border-slate-200 last:border-r-0 align-top"
                          >
                            {entry ? (
                              <div
                                className={cn(
                                  'rounded-lg border p-2.5',
                                  unitColourMap[entry.unit_code] ?? UNIT_COLOURS[0]
                                )}
                              >
                                <p className="font-semibold text-xs leading-tight line-clamp-2">
                                  {entry.unit_name}
                                </p>
                                <p className="text-xs opacity-70 mt-0.5 font-mono">
                                  {entry.unit_code}
                                </p>
                                <div className="mt-1.5 space-y-0.5">
                                  {entry.trainer_name && (
                                    <p className="text-xs opacity-80 flex items-center gap-1">
                                      <Users className="w-3 h-3 shrink-0" />
                                      {entry.trainer_name}
                                    </p>
                                  )}
                                  {entry.room_code && (
                                    <p className="text-xs opacity-80 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      {entry.room_code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="min-h-[60px]" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          {Object.keys(unitColourMap).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(unitColourMap).map(([code, colour]) => {
                let name = code
                outer: for (const dayRow of Object.values(grid)) {
                  for (const entry of Object.values(dayRow)) {
                    if (entry?.unit_code === code) { name = entry.unit_name; break outer }
                  }
                }
                return (
                  <span key={code} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', colour)}>
                    {code} — {name}
                  </span>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}