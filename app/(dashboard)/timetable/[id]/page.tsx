'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Calendar, Clock, Users, Home, BookOpen, User, Loader2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledUnit {
  id: string
  cohort: { id: string; name: string }
  curriculum_unit: { id: string; code: string; name: string; unit_type: string; periods_per_week: number }
  trainer: { id: string; first_name: string; last_name: string; staff_id: string } | null
  room: { id: string; name: string; code: string; room_type: string; capacity: number } | null
  day: string
  period: { id: string; label: string; start_time: string; end_time: string }
  status: 'DRAFT' | 'PUBLISHED'
  notes?: string
}

const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday'
}

export default function TimetableEntryPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['timetable-entry', id],
    queryFn: () => api.get(`/timetable/entry/${id}/`).then(r => r.data.data as ScheduledUnit),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <p className="text-lg font-medium">Entry not found</p>
        <button onClick={() => router.back()} className="text-sm text-[#1e3a5f] hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const fields = [
    {
      icon: BookOpen,
      label: 'Unit',
      value: `${entry.curriculum_unit.code} — ${entry.curriculum_unit.name}`,
      sub: `${entry.curriculum_unit.unit_type} · ${entry.curriculum_unit.periods_per_week} period(s)/week`,
    },
    {
      icon: Users,
      label: 'Cohort',
      value: entry.cohort.name,
    },
    {
      icon: Calendar,
      label: 'Day',
      value: DAY_LABELS[entry.day] ?? entry.day,
    },
    {
      icon: Clock,
      label: 'Period',
      value: entry.period.label,
      sub: entry.period.start_time && entry.period.end_time
        ? `${entry.period.start_time} – ${entry.period.end_time}`
        : undefined,
    },
    {
      icon: User,
      label: 'Trainer',
      value: entry.trainer
        ? `${entry.trainer.first_name} ${entry.trainer.last_name}`
        : 'Unassigned',
      sub: entry.trainer?.staff_id,
    },
    {
      icon: Home,
      label: 'Room',
      value: entry.room ? `${entry.room.name} (${entry.room.code})` : 'Unassigned',
      sub: entry.room ? `${entry.room.room_type} · Capacity ${entry.room.capacity}` : undefined,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/timetable')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Timetable
        </button>
        <button
          onClick={() => router.push(`/timetable/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#162d4a] font-medium"
        >
          <Edit size={14} />
          Edit Entry
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">
              Scheduled Entry
            </p>
            <h1 className="text-white text-xl font-bold">{entry.curriculum_unit.code}</h1>
            <p className="text-blue-200 text-sm mt-0.5">{entry.curriculum_unit.name}</p>
          </div>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold',
              entry.status === 'PUBLISHED'
                ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                : 'bg-blue-400/20 text-blue-200 border border-blue-400/30'
            )}
          >
            {entry.status}
          </span>
        </div>

        {/* Fields */}
        <div className="divide-y divide-gray-50">
          {fields.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="flex items-start gap-4 px-6 py-4">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon size={15} className="text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}

          {entry.notes && (
            <div className="px-6 py-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600">{entry.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}