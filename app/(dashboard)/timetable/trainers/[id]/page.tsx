'use client'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useTerms, useTrainers } from '@/hooks/useSetup'
import { useTrainerTimetable } from '@/hooks/useTimetable'
import { ArrowLeft, AlertCircle, Clock, Users, BookOpen, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_LABELS } from '@/types'
import type { Period, ScheduledUnit, Trainer } from '@/types'

// Shape returned by GET /api/timetable/trainer/<id>/?term=<id>
interface TrainerTimetableResponse {
  trainer: string
  trainer_name: string
  term: string
  periods: Period[]
  days: string[]
  grid: Record<string, Record<string, ScheduledUnit | null>>
}

const COHORT_COLOURS = [
  'bg-sky-100 border-sky-300 text-sky-900',
  'bg-violet-100 border-violet-300 text-violet-900',
  'bg-emerald-100 border-emerald-300 text-emerald-900',
  'bg-amber-100 border-amber-300 text-amber-900',
  'bg-rose-100 border-rose-300 text-rose-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
  'bg-teal-100 border-teal-300 text-teal-900',
  'bg-orange-100 border-orange-300 text-orange-900',
]

function trainerFullName(trainer: Trainer): string {
  return [trainer.title, trainer.first_name, trainer.last_name].filter(Boolean).join(' ')
}

export default function TrainerTimetablePage({
  params,
}: {
  params: Promise<{ id: string }>   // matches folder [id]
}) {
  const { id } = use(params)        // matches folder [id]
  const router = useRouter()

  const { data: terms = [] } = useTerms()
  const { data: trainers = [] } = useTrainers()
  const { activeTerm, setActiveTerm } = useTermStore()

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const active = terms.find((t) => t.is_current) ?? terms[terms.length - 1]
      if (active) setActiveTerm(active)
    }
  }, [terms, activeTerm, setActiveTerm])

  const termId = activeTerm?.id ?? ''
  const trainer = trainers.find((t: Trainer) => t.id === id)

  // useTrainerTimetable still takes (trainerId, termId) — we just pass id
  const { data, isLoading, isError, error } = useTrainerTimetable(id, termId)
  const ttData = data as TrainerTimetableResponse | undefined

  // Build cohort_name → colour map
  const cohortColourMap: Record<string, string> = {}
  let colourIdx = 0
  if (ttData?.grid) {
    for (const dayRow of Object.values(ttData.grid)) {
      for (const entry of Object.values(dayRow)) {
        if (entry && !(entry.cohort_name in cohortColourMap)) {
          cohortColourMap[entry.cohort_name] = COHORT_COLOURS[colourIdx % COHORT_COLOURS.length]
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

  const displayName = trainer
    ? trainerFullName(trainer)
    : (ttData?.trainer_name ?? 'Trainer Timetable')

  return (
    <div className="px-4 py-6 max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/timetable/trainer')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Trainers
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{displayName}</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{displayName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeTerm ? activeTerm.name : 'Loading term…'}
            {totalSessions > 0 && ` · ${totalSessions} sessions`}
          </p>
          {trainer?.email && (
            <p className="text-xs text-slate-400 mt-0.5">{trainer.email}</p>
          )}
          {trainer?.department && (
            <p className="text-xs text-slate-500 mt-0.5">{trainer.department}</p>
          )}
        </div>
        {!termId && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-md">
            No active term selected
          </span>
        )}
      </div>

      {/* No term */}
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
              <p className="text-xs mt-1">This trainer has no sessions for the current term.</p>
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
                                  cohortColourMap[entry.cohort_name] ?? COHORT_COLOURS[0]
                                )}
                              >
                                <p className="font-semibold text-xs leading-tight line-clamp-2">
                                  {entry.unit_name}
                                </p>
                                <p className="text-xs opacity-70 mt-0.5 font-mono">
                                  {entry.unit_code}
                                </p>
                                <div className="mt-1.5 space-y-0.5">
                                  <p className="text-xs opacity-80 flex items-center gap-1">
                                    <Users className="w-3 h-3 shrink-0" />
                                    {entry.cohort_name}
                                  </p>
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

          {/* Cohort legend */}
          {Object.keys(cohortColourMap).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(cohortColourMap).map(([name, colour]) => (
                <span
                  key={name}
                  className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', colour)}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}