'use client'

import { useAuthStore, useTermStore } from '@/store'
import { useTrainerDashboard, useTrainerTimetable } from '@/hooks/useTimetable'
import { useTrainers } from '@/hooks/useSetup'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import { BookOpen, Clock, TrendingUp, CalendarDays } from 'lucide-react'

function WorkloadBar({ used, max }: { used: number; max: number }) {
  const pct    = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const colour = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Workload</span><span>{used} / {max} periods</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">{pct}% of weekly capacity</p>
    </div>
  )
}

export default function TrainerDashboardPage() {
  const { user }       = useAuthStore()
  const { activeTerm } = useTermStore()
  const termId         = activeTerm?.id ?? ''

  const { data: dash, isLoading: dashLoading } = useTrainerDashboard()
  const { data: trainers = [] }                = useTrainers()

  const trainer   = trainers.find(t => t.staff_id === user?.username)
  const trainerId = trainer?.id ?? ''

  const { data: ttData, isLoading: gridLoading } = useTrainerTimetable(trainerId, termId)
  const entries = ttData?.entries ?? []
  const periods = ttData?.periods ?? []
  const days    = ttData?.days    ?? []

  // Derive values from what TrainerDashboardData actually has
  const scheduledCount   = (dash as any)?.scheduled_count   ?? 0
  const periodsThisWeek  = (dash as any)?.periods_this_week  ?? scheduledCount
  const maxPeriodsPerDay = (dash as any)?.max_periods_per_day ?? 4

  if (!termId) return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-amber-800">Select a term from the top bar</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {user?.username} · {activeTerm?.name}
        </p>
      </div>
      {dashLoading ? (
        <div className="stat-grid animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-gray-100" />)}
        </div>
      ) : dash ? (
        <div className="stat-grid">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Scheduled Units</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{scheduledCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Periods This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{periodsThisWeek}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Capacity</span>
            </div>
            <WorkloadBar used={periodsThisWeek} max={maxPeriodsPerDay * 5} />
          </div>
        </div>
      ) : null}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">My Timetable</h2>
        {gridLoading ? (
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center">
            <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No classes scheduled for this term</p>
          </div>
        ) : (
          <TimetableGrid entries={entries} periods={periods} days={days} readOnly />
        )}
      </div>
    </div>
  )
}