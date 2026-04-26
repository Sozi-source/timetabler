'use client'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useCohorts } from '@/hooks/useSetup'
import { Users } from 'lucide-react'

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
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cohorts.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/timetable/cohort/${c.id}`)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Users className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.programme ?? ''  }</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
