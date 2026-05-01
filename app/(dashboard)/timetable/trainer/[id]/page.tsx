'use client'
import { useState, use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Clock, Users, BookOpen, Calendar } from 'lucide-react'

interface PeriodMeta {
  id: string
  label: string
  start: string
  end: string
  order: number
  is_break: boolean
  duration: number
}

interface SessionEntry {
  id: string
  unit_code: string
  unit_name: string
  cohort: string
  cohort_id: string
  room: string
  room_id: string
  day: string
  period_label: string
  period_id: string
  is_combined: boolean
  status: 'DRAFT' | 'PUBLISHED'
}

interface TrainerTimetableData {
  trainer: string
  trainer_id: string
  staff_id: string
  department: string
  employment_type: string
  max_periods_per_week: number
  term: string
  term_id: string
  days: string[]
  periods: PeriodMeta[]
  grid: Record<string, Record<string, SessionEntry | null>>
  periods_this_week: number
  capacity_remaining: number
}

const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday'
}

const COHORT_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-green-50 border-green-200 text-green-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
]

export default function TrainerTimetablePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise, must be unwrapped with React.use()
  const params = use(paramsPromise)
  const router = useRouter()
  const [viewStatus, setViewStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

  // Fetch active term directly — don't rely on store hydration
  const { data: activeTerm } = useQuery({
    queryKey: ['terms-active'],
    queryFn: async () => {
      const res = await api.get('/terms/')
      const terms: any[] = res.data?.data ?? []
      return terms.find(t => t.is_current) ?? terms[0] ?? null
    },
  })

  const termId = activeTerm?.id

  const { data, isLoading, error } = useQuery<TrainerTimetableData>({
    queryKey: ['trainer-timetable', params.id, termId, viewStatus],
    queryFn: async () => {
      const res = await api.get(`/timetable/trainer/${params.id}/`, {
        params: { term: termId, status: viewStatus }
      })
      return res.data?.data
    },
    enabled: !!termId && !!params.id,
  })

  // Build cohort colour map
  const cohortColorMap: Record<string, string> = {}
  if (data?.grid) {
    let colorIdx = 0
    for (const day of Object.values(data.grid)) {
      for (const entry of Object.values(day)) {
        if (entry && entry.cohort && !cohortColorMap[entry.cohort]) {
          cohortColorMap[entry.cohort] = COHORT_COLORS[colorIdx % COHORT_COLORS.length]
          colorIdx++
        }
      }
    }
  }

  const days = data?.days ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const periods = (data?.periods ?? []).filter((p: PeriodMeta) => !p.is_break)
  const grid = data?.grid ?? {}

  const totalSessions = Object.values(grid).reduce((acc, day) =>
    acc + Object.values(day).filter(e => e !== null).length, 0
  )

  const initials = data?.trainer
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/timetable/trainer')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Trainers
      </button>

      {!termId ? (
        <div className="text-center py-12 text-gray-400">Loading term...</div>
      ) : isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading timetable...</div>
      ) : error || !data ? (
        <div className="text-center py-12 text-red-400">
          Failed to load timetable. Check that this trainer has sessions scheduled.
        </div>
      ) : (
        <>
          {/* Trainer header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{data.trainer}</h1>
                <p className="text-sm text-gray-500">
                  {data.department}
                  {data.staff_id ? ` · ${data.staff_id}` : ''}
                  {data.employment_type ? ` · ${data.employment_type}` : ''}
                </p>
              </div>
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['DRAFT', 'PUBLISHED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setViewStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewStatus === s
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Calendar, label: 'Sessions', value: totalSessions },
              { icon: Clock, label: 'Periods/week', value: data.periods_this_week },
              { icon: BookOpen, label: 'Capacity left', value: data.capacity_remaining },
              { icon: Users, label: 'Max periods', value: data.max_periods_per_week },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
              </div>
            ))}
          </div>

          {/* Cohort legend */}
          {Object.keys(cohortColorMap).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(cohortColorMap).map(([cohort, colorClass]) => (
                <span key={cohort} className={`text-xs px-2 py-1 rounded-full border font-medium ${colorClass}`}>
                  {cohort}
                </span>
              ))}
            </div>
          )}

          {/* Timetable grid */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 w-32 border-r border-gray-200">
                      Period
                    </th>
                    {days.map(day => (
                      <th key={day} className="text-center p-3 text-xs font-semibold text-gray-700">
                        {DAY_LABELS[day] ?? day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={days.length + 1} className="text-center py-12 text-gray-400 text-sm">
                        No sessions scheduled for this trainer this term.
                      </td>
                    </tr>
                  ) : (
                    periods.map((period, pIdx) => (
                      <tr key={period.id} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="p-3 border-r border-gray-100 align-top">
                          <p className="text-xs font-semibold text-gray-700">{period.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {period.start?.slice(0, 5)} – {period.end?.slice(0, 5)}
                          </p>
                        </td>
                        {days.map(day => {
                          const entry = grid[day]?.[period.id] ?? null
                          return (
                            <td key={day} className="p-2 align-top border-r border-gray-100 last:border-r-0">
                              {entry ? (
                                <div className={`rounded-lg border p-2 text-xs ${cohortColorMap[entry.cohort] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                  <p className="font-semibold leading-tight line-clamp-2">{entry.unit_name}</p>
                                  <p className="mt-1 opacity-75">{entry.cohort}</p>
                                  {entry.room && (
                                    <p className="mt-0.5 opacity-60 font-mono text-[10px]">{entry.room}</p>
                                  )}
                                  {entry.is_combined && (
                                    <span className="mt-1 inline-block bg-white/50 rounded px-1 text-[10px]">
                                      combined
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="h-16 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                                  <span className="text-gray-300 text-xs">—</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Term info */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            {data.term} · {viewStatus.charAt(0) + viewStatus.slice(1).toLowerCase()}
          </p>
        </>
      )}
    </div>
  )
}