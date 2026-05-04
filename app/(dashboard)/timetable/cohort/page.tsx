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
  const statusConfig =
    unit.status === 'COMPLETED'   ? { cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200', label: 'Done' } :
    unit.status === 'IN_PROGRESS' ? { cls: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200', label: 'Active' } :
                                    { cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', label: 'Pending' }

  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-black/5 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-mono font-semibold text-current opacity-50 shrink-0">{unit.code}</span>
        <span className="text-xs text-current opacity-80 truncate">{unit.name}</span>
        <span className="text-[10px] text-current opacity-40 shrink-0">{unit.unit_type}</span>
      </div>
      <span className={cn('text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 font-semibold', statusConfig.cls)}>
        {statusConfig.label}
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
    <div className={cn('rounded-2xl border p-4 transition-all', color)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs opacity-50 font-medium">({units.length})</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 opacity-40 group-hover:opacity-70 transition-opacity" />
          : <ChevronDown className="h-4 w-4 opacity-40 group-hover:opacity-70 transition-opacity" />
        }
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

  const coveredUnits  = Object.values(progressData?.covered  ?? {}).flat()
  const currentUnits  = Object.values(progressData?.current  ?? {}).flat()
  const upcomingUnits = Object.values(progressData?.upcoming ?? {}).flat()
  const pct = progressData?.summary?.percentage ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors active:scale-[.97] shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {cohort?.name ?? 'Cohort'}
            <span className="text-gray-300 font-light"> — </span>
            <span className="text-gray-600 font-semibold">Timetable</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? 'No term selected'}
            {cohort && (
              <span className="ml-2 text-gray-400">
                · {cohort.start_month ? MONTHS[cohort.start_month - 1] : ''} {cohort.start_year} intake
              </span>
            )}
          </p>
        </div>
        {progressData && (
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 text-sm font-semibold">
              Term {progressData.current_term}
              <span className="text-blue-400 font-normal">of {progressData.total_terms}</span>
            </span>
            <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(pct)}% complete</p>
          </div>
        )}
      </div>

      {/* Progress card */}
      {progressData && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Programme progress</p>
            <p className="text-xs text-gray-400">
              {progressData.summary.completed} / {progressData.summary.total} units
            </p>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-6 mt-4">
            {[
              { value: coveredUnits.length,  label: 'Covered',   color: 'text-gray-600' },
              { value: currentUnits.length,  label: 'This term', color: 'text-blue-600' },
              { value: upcomingUnits.length, label: 'Next term', color: 'text-gray-400' },
            ].map(({ value, label, color }) => (
              <div key={label} className="text-center">
                <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
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
            defaultOpen
          />
          <TermSection
            title="Next Term Preview"
            icon={<BookOpen className="h-4 w-4 text-gray-500" />}
            color="border-gray-200 bg-gray-50 text-gray-700"
            units={upcomingUnits}
          />
          <TermSection
            title="Covered Units"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            color="border-emerald-200 bg-emerald-50 text-emerald-900"
            units={coveredUnits}
          />
        </div>
      )}

      {/* Timetable grid */}
      {!termId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-amber-800">Select a term from the top bar</p>
          <p className="text-xs text-amber-600 mt-1">A term is required to view the timetable grid.</p>
        </div>
      )}
      {termId && isLoading && (
        <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
      )}
      {termId && !isLoading && entries.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No entries for this cohort this term</p>
          <p className="text-xs text-gray-400 mt-1">Generate the timetable to populate sessions.</p>
        </div>
      )}
      {termId && !isLoading && entries.length > 0 && (
        <TimetableGrid entries={entries} periods={periods} days={days} readOnly />
      )}
    </div>
  )
}