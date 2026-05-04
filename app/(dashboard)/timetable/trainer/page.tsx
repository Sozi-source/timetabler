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
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
]

export default function TrainerTimetablePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const [viewStatus, setViewStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

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

  const days    = data?.days    ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const periods = (data?.periods ?? []).filter((p: PeriodMeta) => !p.is_break)
  const grid    = data?.grid    ?? {}

  const totalSessions = Object.values(grid).reduce((acc, day) =>
    acc + Object.values(day).filter(e => e !== null).length, 0
  )

  const initials = data?.trainer
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  const loadPercent = data
    ? Math.round((data.periods_this_week / Math.max(data.max_periods_per_week, 1)) * 100)
    : 0

  return (
    <div className="p-6">
      {/* Back */}
      <button
        onClick={() => router.push('/timetable/trainer')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        All Trainers
      </button>

      {!termId ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="h-8 w-8 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Loading active term…</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-gray-100 animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : error || !data ? (
        <div className="text-center py-16 rounded-2xl border border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-600">Failed to load timetable</p>
          <p className="text-xs text-red-400 mt-1">Check that this trainer has sessions scheduled.</p>
        </div>
      ) : (
        <>
          {/* Trainer header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center text-base font-bold shrink-0 ring-1 ring-[#1e3a5f]/10">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{data.trainer}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {data.department}
                  {data.staff_id && <span className="text-gray-400"> · <span className="font-mono">{data.staff_id}</span></span>}
                  {data.employment_type && <span className="text-gray-400"> · {data.employment_type}</span>}
                </p>
              </div>
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['DRAFT', 'PUBLISHED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setViewStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              { icon: Calendar, label: 'Sessions',     value: totalSessions,              sub: 'total' },
              { icon: Clock,    label: 'Periods/week', value: data.periods_this_week,     sub: 'scheduled' },
              { icon: BookOpen, label: 'Capacity left',value: data.capacity_remaining,    sub: 'remaining' },
              { icon: Users,    label: 'Max periods',  value: data.max_periods_per_week,  sub: 'per week' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{value ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Load bar */}
          {data.max_periods_per_week > 0 && (
            <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Weekly load</p>
                <p className="text-xs font-semibold text-gray-600 tabular-nums">
                  {data.periods_this_week} / {data.max_periods_per_week} periods ({loadPercent}%)
                </p>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    loadPercent >= 90 ? 'bg-red-400' : loadPercent >= 70 ? 'bg-amber-400' : 'bg-[#1e3a5f]'
                  }`}
                  style={{ width: `${Math.min(loadPercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Cohort legend */}
          {Object.keys(cohortColorMap).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(cohortColorMap).map(([cohort, colorClass]) => (
                <span key={cohort} className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${colorClass}`}>
                  {cohort}
                </span>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-32 border-r border-gray-100">
                      Period
                    </th>
                    {days.map(day => (
                      <th key={day} className="text-center p-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {DAY_LABELS[day] ?? day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={days.length + 1} className="text-center py-16 text-gray-400 text-sm">
                        No sessions scheduled for this trainer this term.
                      </td>
                    </tr>
                  ) : (
                    periods.map((period, pIdx) => (
                      <tr key={period.id} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                        <td className="p-3 border-r border-gray-100 align-top">
                          <p className="text-xs font-bold text-gray-700">{period.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {period.start?.slice(0, 5)} – {period.end?.slice(0, 5)}
                          </p>
                        </td>
                        {days.map(day => {
                          const entry = grid[day]?.[period.id] ?? null
                          return (
                            <td key={day} className="p-2 align-top border-r border-gray-100 last:border-r-0">
                              {entry ? (
                                <div className={`rounded-xl border p-2.5 text-xs ring-0 ${cohortColorMap[entry.cohort] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                  <p className="font-bold leading-tight line-clamp-2">{entry.unit_name}</p>
                                  <p className="mt-1 opacity-60 text-[10px] font-semibold">{entry.cohort}</p>
                                  {entry.room && (
                                    <p className="mt-0.5 opacity-50 font-mono text-[10px]">{entry.room}</p>
                                  )}
                                  {entry.is_combined && (
                                    <span className="mt-1.5 inline-block bg-white/60 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                                      combined
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="h-16 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
                                  <span className="text-gray-200 text-xs">—</span>
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

          <p className="text-[10px] text-gray-400 mt-4 text-center font-mono">
            {data.term} · {viewStatus.charAt(0) + viewStatus.slice(1).toLowerCase()}
          </p>
        </>
      )}
    </div>
  )
}