'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useCohortTimetable } from '@/hooks/useTimetable'
import { useCohorts } from '@/hooks/useSetup'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import { ArrowLeft, CalendarDays } from 'lucide-react'

export default function CohortTimetablePage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId }   = use(params)
  const router         = useRouter()
  const { activeTerm } = useTermStore()
  const termId         = activeTerm?.id ?? ''

  const { data: cohorts = [] }            = useCohorts()
  const { data: ttData, isLoading } = useCohortTimetable(cohortId, termId)
  const entries = ttData?.entries ?? []
  const periods = ttData?.periods ?? []
  const days    = ttData?.days    ?? []
  const cohort = cohorts.find(c => c.id === cohortId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{cohort?.name ?? 'Cohort'} — Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeTerm?.name ?? 'No term selected'}</p>
        </div>
      </div>
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
      {termId && !isLoading && entries.length > 0 && <TimetableGrid entries={entries} periods={periods} days={days} readOnly />}
    </div>
  )
}
