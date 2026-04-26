'use client'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import { useTrainers } from '@/hooks/useSetup'
import { User } from 'lucide-react'

export default function TrainerSelectorPage() {
  const router = useRouter()
  const { activeTerm } = useTermStore()
  const { data: trainers = [], isLoading } = useTrainers()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Timetable by Trainer</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeTerm?.name ?? 'No term selected'}</p>
      </div>
      {isLoading && <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trainers.map(t => (
            <button
              key={t.id}
              onClick={() => router.push('/timetable/trainer/' + t.id)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <User className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{[t.title, t.first_name, t.last_name].filter(Boolean).join(' ')}</p>
                <p className="text-xs text-gray-500">{t.staff_id}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}