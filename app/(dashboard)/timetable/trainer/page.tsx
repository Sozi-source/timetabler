'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import api from '@/lib/api'
import { User, Clock, ChevronRight, BookOpen, Briefcase } from 'lucide-react'

interface Trainer {
  id: string
  short_name: string
  full_name: string
  staff_id: string
  department: string
  employment_type: string
  is_active: boolean
}

export default function TrainerTimetableListPage() {
  const { activeTerm } = useTermStore()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data: trainers = [], isLoading } = useQuery<Trainer[]>({
    queryKey: ['trainers'],
    queryFn: async () => {
      const res = await api.get('/trainers/')
      return res.data?.data ?? []
    },
  })

  const filtered = trainers.filter(t =>
    t.short_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase())
  )

  const active = filtered.filter(t => t.is_active)
  const inactive = filtered.filter(t => !t.is_active)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trainer Timetables</h1>
        <p className="text-gray-500 mt-1">
          {activeTerm ? `${activeTerm.name} · ` : ''}Select a trainer to view their schedule
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search trainers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading trainers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No trainers found</div>
      ) : (
        <div className="space-y-6">
          {/* Active trainers */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Active — {active.length} trainers
              </h2>
              <div className="grid gap-3">
                {active.map(trainer => (
                  <TrainerCard
                    key={trainer.id}
                    trainer={trainer}
                    onClick={() => router.push(`/timetable/trainer/${trainer.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive trainers */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Inactive — {inactive.length} trainers
              </h2>
              <div className="grid gap-3 opacity-60">
                {inactive.map(trainer => (
                  <TrainerCard
                    key={trainer.id}
                    trainer={trainer}
                    onClick={() => router.push(`/timetable/trainer/${trainer.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrainerCard({ trainer, onClick }: { trainer: Trainer; onClick: () => void }) {
  const initials = trainer.short_name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{trainer.short_name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {trainer.department && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {trainer.department}
            </span>
          )}
          {trainer.employment_type && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {trainer.employment_type}
            </span>
          )}
        </div>
      </div>

      {/* Staff ID */}
      {trainer.staff_id && (
        <span className="text-xs text-gray-400 font-mono flex-shrink-0">
          {trainer.staff_id}
        </span>
      )}

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </button>
  )
}