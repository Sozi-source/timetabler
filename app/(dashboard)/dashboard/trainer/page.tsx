'use client'

import { useAuthStore, useTermStore } from '@/store'
import { useTrainerDashboard, useTrainerTimetable } from '@/hooks/useTimetable'
import { useTrainers } from '@/hooks/useSetup'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import { BookOpen, Clock, TrendingUp, CalendarDays, AlertTriangle } from 'lucide-react'

// ── Workload bar ──────────────────────────────────────────────────────────
function WorkloadBar({ used, max }: { used: number; max: number }) {
  const pct    = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const colour = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
  const textColour = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Weekly capacity</span>
        <span className={`text-xs font-bold tabular-nums ${textColour}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{used} of {max} periods scheduled</p>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'default',
}: {
  icon: React.ElementType
  label: string
  value: number
  accent?: 'default' | 'blue' | 'amber' | 'red'
}) {
  const colours = {
    default: { bg: 'bg-slate-50',  icon: 'text-slate-500',  val: 'text-gray-900' },
    blue:    { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-900' },
    amber:   { bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-900' },
    red:     { bg: 'bg-red-50',    icon: 'text-red-500',    val: 'text-red-900' },
  }
  const c = colours[accent]
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.icon}`} />
        </div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${c.val}`}>{value}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
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

  const scheduledCount   = (dash as any)?.scheduled_count   ?? 0
  const periodsThisWeek  = (dash as any)?.periods_this_week  ?? scheduledCount
  const maxPeriodsPerDay = (dash as any)?.max_periods_per_day ?? 4

  if (!termId) return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
      <p className="text-sm font-medium text-amber-800">Select a term from the top bar</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {user?.username}
          {activeTerm?.name && <> · <span className="font-medium text-gray-700">{activeTerm.name}</span></>}
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      {dashLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : dash ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={BookOpen} label="Scheduled units"   value={scheduledCount}  accent="blue" />
          <StatCard icon={Clock}    label="Periods this week" value={periodsThisWeek} accent="default" />

          {/* Workload card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Capacity</span>
            </div>
            <WorkloadBar used={periodsThisWeek} max={maxPeriodsPerDay * 5} />
          </div>
        </div>
      ) : null}

      {/* ── Timetable ──────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">My Timetable</h2>

        {gridLoading ? (
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
              <CalendarDays className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No classes scheduled</p>
            <p className="text-xs text-gray-400 mt-1">No sessions found for this term</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <TimetableGrid entries={entries} periods={periods} days={days} readOnly />
          </div>
        )}
      </div>

    </div>
  )
}