'use client'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useCohorts } from '@/hooks/useSetup'
import { Users, AlertTriangle, CheckCircle2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function CohortSelectorPage() {
  const router = useRouter()
  const { activeTerm } = useTermStore()
  const { data: cohorts = [], isLoading } = useCohorts()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Timetable by Cohort</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {activeTerm
            ? <span><span className="font-medium text-gray-600">{activeTerm.name}</span> · Select a cohort to view its schedule</span>
            : 'No term selected — pick one from the top bar'
          }
        </p>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && cohorts.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No cohorts found</p>
          <p className="text-xs text-gray-400 mt-1">Add cohorts in the Setup section first.</p>
        </div>
      )}

      {/* Cohort grid */}
      {!isLoading && cohorts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cohorts.map(c => {
            const synced   = c.term_is_synced ?? true
            const computed = c.computed_current_term ?? c.current_term
            const intakeMonth = c.start_month ? MONTHS[c.start_month - 1] : ''
            const intakeYear  = c.start_year ?? ''

            return (
              <button
                key={c.id}
                onClick={() => router.push(`/timetable/cohort/${c.id}`)}
                className="group flex items-start gap-3.5 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left hover:border-[#1e3a5f]/30 hover:shadow-sm transition-all active:scale-[.98]"
              >
                {/* Icon chip */}
                <div className="mt-0.5 h-9 w-9 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{c.name}</p>
                  {c.programme && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.programme}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {/* Intake */}
                    {(intakeMonth || intakeYear) && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {intakeMonth} {intakeYear}
                      </span>
                    )}

                    {/* Term badge */}
                    <span className="inline-flex items-center rounded-full bg-[#1e3a5f]/8 text-[#1e3a5f] px-2 py-0.5 text-[10px] font-bold ring-1 ring-[#1e3a5f]/10">
                      Term {c.current_term}
                    </span>

                    {/* Sync status */}
                    {synced ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5 ring-1 ring-amber-200">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        T{computed} due
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}