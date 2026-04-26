'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useTrainerTimetable } from '@/hooks/useTimetable'
import { useTrainers } from '@/hooks/useSetup'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import { ArrowLeft, CalendarDays } from 'lucide-react'

export default function TrainerTimetablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trainerId } = use(params)
  const router            = useRouter()
  const { activeTerm }    = useTermStore()
  const termId            = activeTerm?.id ?? ''

  const { data: trainers = [] }           = useTrainers()
  const { data: ttData, isLoading } = useTrainerTimetable(trainerId, termId)
  const entries = ttData?.entries ?? []
  const periods = ttData?.periods ?? []
  const days    = ttData?.days    ?? []
  const trainer = trainers.find(t => t.id === trainerId)
  const name    = trainer
    ? [trainer.title, trainer.first_name, trainer.last_name].filter(Boolean).join(' ')
    : '...'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name} - Timetable</h1>
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
          <p className="text-sm font-medium text-gray-500">No entries for this trainer and term</p>
        </div>
      )}
      {termId && !isLoading && entries.length > 0 && <TimetableGrid entries={entries} periods={periods} days={days} readOnly />}
    </div>
  )
}
