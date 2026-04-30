'use client'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useCohorts } from '@/hooks/useSetup'
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function CohortSelectorPage() {
  const router = useRouter()
  const { activeTerm } = useTermStore()
  const { data: cohorts = [], isLoading } = useCohorts()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Timetable by Cohort</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeTerm?.name ?? 'No term selected'}</p>
      </div>

      {isLoading && <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />}

      {!isLoading && cohorts.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No cohorts found</p>
        </div>
      )}

      {!isLoading && cohorts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cohorts.map(c => {
            const synced = c.term_is_synced ?? true
            const computed = c.computed_current_term ?? c.current_term
            return (
              <button
                key={c.id}
                onClick={() => router.push(`/timetable/cohort/${c.id}`)}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.programme ?? ''}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Intake */}
                    <span className="text-xs text-gray-400">
                      {c.start_month ? MONTHS[c.start_month - 1] : ''} {c.start_year}
                    </span>
                    {/* Current term badge */}
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                      T{c.current_term}
                    </span>
                    {/* Sync status */}
                    {synced
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          T{computed} due
                        </span>
                      )
                    }
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