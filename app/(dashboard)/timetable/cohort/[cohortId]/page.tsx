'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useCohortTimetable } from '@/hooks/useTimetable'
import { useCohorts } from '@/hooks/useSetup'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import api from '@/lib/api'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, CheckCircle2, Clock, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type UnitEntry = {
  unit_id: string
  code: string
  name: string
  credit_hours: number
  unit_type: string
  status: string
}

type ProgressData = {
  cohort_id: string
  cohort_name: string
  programme: string
  current_term: number
  computed_current_term: number
  term_is_synced: boolean
  total_terms: number
  summary: { total: number; completed: number; in_progress: number; remaining: number; percentage: number }
  covered: Record<number, UnitEntry[]>
  current: Record<number, UnitEntry[]>
  upcoming: Record<number, UnitEntry[]>
}

function UnitRow({ unit }: { unit: UnitEntry }) {
  const statusColor =
    unit.status === 'COMPLETED'   ? 'bg-emerald-100 text-emerald-700' :
    unit.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
    'bg-gray-100 text-gray-500'

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-gray-400 shrink-0">{unit.code}</span>
        <span className="text-xs text-gray-700 truncate">{unit.name}</span>
        <span className="text-xs text-gray-400 shrink-0">{unit.unit_type}</span>
      </div>
      <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0 ml-2', statusColor)}>
        {unit.status === 'COMPLETED' ? 'Done' :
         unit.status === 'IN_PROGRESS' ? 'Active' : 'Pending'}
      </span>
    </div>
  )
}

function TermSection({
  title, icon, color, units, defaultOpen = false
}: {
  title: string
  icon: React.ReactNode
  color: string
  units: UnitEntry[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (units.length === 0) return null
  return (
    <div className={cn('rounded-xl border p-4', color)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs opacity-70">({units.length} units)</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
      </button>
      {open && (
        <div className="mt-3 space-y-0.5 border-t border-black/5 pt-3">
          {units.map(u => <UnitRow key={u.unit_id} unit={u} />)}
        </div>
      )}
    </div>
  )
}

export default function CohortTimetablePage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId }   = use(params)
  const router         = useRouter()
  const { activeTerm } = useTermStore()
  const termId         = activeTerm?.id ?? ''

  const { data: cohorts = [] }      = useCohorts()
  const { data: ttData, isLoading } = useCohortTimetable(cohortId, termId)
  const { data: progressData }      = useQuery<ProgressData>({
    queryKey: queryKeys.cohortProgress(cohortId),
    queryFn:  () => api.get(`/cohorts/${cohortId}/progress/`).then(r => r.data.data),
    enabled:  !!cohortId,
  })

  const entries = ttData?.entries ?? []
  const periods = ttData?.periods ?? []
  const days    = ttData?.days    ?? []
  const cohort  = cohorts.find(c => c.id === cohortId)

  // Flatten bucketed units
  const coveredUnits  = Object.values(progressData?.covered  ?? {}).flat()
  const currentUnits  = Object.values(progressData?.current  ?? {}).flat()
  const upcomingUnits = Object.values(progressData?.upcoming ?? {}).flat()
  const pct = progressData?.summary?.percentage ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{cohort?.name ?? 'Cohort'} — Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? 'No term selected'}
            {cohort && (
              <span className="ml-2 text-gray-400">
                · {cohort.start_month ? MONTHS[cohort.start_month - 1] : ''} {cohort.start_year} intake
              </span>
            )}
          </p>
        </div>
        {/* Term badge */}
        {progressData && (
          <div className="text-right">
            <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-semibold">
              Term {progressData.current_term} of {progressData.total_terms}
            </span>
            <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}% complete</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progressData && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Programme progress</p>
            <p className="text-xs text-gray-400">
              {progressData.summary.completed} of {progressData.summary.total} units completed
            </p>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-700">{coveredUnits.length}</p>
              <p className="text-xs text-gray-400">Covered</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{currentUnits.length}</p>
              <p className="text-xs text-gray-400">This term</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-400">{upcomingUnits.length}</p>
              <p className="text-xs text-gray-400">Next term</p>
            </div>
          </div>
        </div>
      )}

      {/* Unit sections */}
      {progressData && (
        <div className="space-y-2">
          <TermSection
            title="Current Term Units"
            icon={<Clock className="h-4 w-4 text-blue-600" />}
            color="border-blue-200 bg-blue-50 text-blue-900"
            units={currentUnits}
            defaultOpen={true}
          />
          <TermSection
            title="Next Term Preview"
            icon={<BookOpen className="h-4 w-4 text-gray-500" />}
            color="border-gray-200 bg-gray-50 text-gray-700"
            units={upcomingUnits}
            defaultOpen={false}
          />
          <TermSection
            title="Covered Units"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            color="border-emerald-200 bg-emerald-50 text-emerald-900"
            units={coveredUnits}
            defaultOpen={false}
          />
        </div>
      )}

      {/* Timetable grid */}
      {!termId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-amber-800">Select a term from the top bar</p>
        </div>
      )}
      {termId && isLoading && <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />}
      {termId && !isLoading && entries.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No entries for this cohort and term</p>
        </div>
      )}
      {termId && !isLoading && entries.length > 0 && (
        <TimetableGrid entries={entries} periods={periods} days={days} readOnly />
      )}
    </div>
  )
}