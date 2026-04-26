'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTermStore } from '@/store'
import api from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Calendar, RefreshCw, Send, AlertTriangle,
  Clock, Users, BookOpen, Home, Loader2, Trash2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduledUnit {
  id: string
  cohort: { id: string; name: string }
  unit_code: string; unit_name: string
  trainer: { id: string; first_name: string; last_name: string } | null
  room: { id: string; name: string; code: string } | null
  day: string
  period: { id: string; label: string; order: number }
  status: 'DRAFT' | 'PUBLISHED'
}

interface PeriodMeta {
  id: string
  label: string
  order: number
}

interface TimetableResponse {
  grid: Record<string, Record<string, ScheduledUnit[]>>
  periods: PeriodMeta[]
  days: string[]
  total_entries: number
  term: string
  status: string
}

interface Conflict {
  id: string
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  unit: string | null
  cohort: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday'
}

// ── API helpers ───────────────────────────────────────────────────────────────
// Backend returns: { grid: { MON: { <period_id>: [entry,...] } }, periods: [...], days: [...] }
const fetchTimetable = (termId: string, status: string): Promise<TimetableResponse> =>
  api.get(`/timetable/master/?term=${termId}&status=${status}`).then(r => {
    const d = r.data?.data ?? r.data ?? {}
    return {
      grid:         d.grid         ?? {},
      periods:      d.periods      ?? [],
      days:         d.days         ?? DAYS,
      total_entries: d.total_entries ?? 0,
      term:         d.term         ?? '',
      status:       d.status       ?? status,
    }
  })

const fetchConflicts = (termId: string): Promise<Conflict[]> =>
  api.get(`/conflicts/?term=${termId}`).then(r => {
    const d = r.data?.data ?? r.data ?? []
    return Array.isArray(d) ? d : []
  })

// ── Grid cell ─────────────────────────────────────────────────────────────────
function TimetableCell({
  entries,
  onClick,
}: {
  entries: ScheduledUnit[]
  onClick: (e: ScheduledUnit) => void
}) {
  if (!entries || entries.length === 0) {
    return (
      <div className="h-full min-h-[72px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-xs">
        —
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {entries.map(entry => (
        <button
          key={entry.id}
          onClick={() => onClick(entry)}
          className={cn(
            'text-left rounded-lg p-2 text-xs border transition-all hover:shadow-md',
            entry.status === 'PUBLISHED'
              ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
          )}
        >
          <p className="font-semibold text-gray-800 truncate">{entry.unit_name}</p>
          <p className="text-gray-500 truncate">{entry.cohort.name}</p>
          {entry.trainer && <p className="text-gray-400 truncate">{entry.trainer ? `${entry.trainer.first_name} ${entry.trainer.last_name}` : null}</p>}
          {entry.room    && <p className="text-gray-400 truncate">{entry.room?.name}</p>}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const activeTerm = useTermStore(s => s.activeTerm)
  const termId = activeTerm?.id ?? ''

  const [selectedCohort, setSelectedCohort] = useState<string>('ALL')
  const [viewStatus, setViewStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED')

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: ttData, isLoading, error } = useQuery({
    queryKey: ['timetable', termId, viewStatus],
    queryFn: () => fetchTimetable(termId, viewStatus),
    enabled: !!termId,
    retry: false,
  })

  // If current status has nothing, try the other one
  const otherStatus = viewStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
  const isEmpty = !ttData || ttData.total_entries === 0
  const { data: fallbackData } = useQuery({
    queryKey: ['timetable', termId, otherStatus],
    queryFn: () => fetchTimetable(termId, otherStatus),
    enabled: !!termId && !isLoading && isEmpty,
  })

  const display = (isEmpty && fallbackData?.total_entries) ? fallbackData : ttData
  const grid    = display?.grid    ?? {}
  const periods = display?.periods ?? []
  const days    = display?.days    ?? DAYS

  const { data: conflicts = [] } = useQuery({
    queryKey: ['conflicts', termId],
    queryFn: () => fetchConflicts(termId),
    enabled: !!termId,
  })
  const highConflicts = conflicts.filter(c => c.severity === 'HIGH')

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const generate = useMutation({
    mutationFn: () => api.post('/timetable/generate/', { term_id: termId }),
    onSuccess: () => {
      toast.success('Timetable generated — switch to DRAFT to preview')
      setViewStatus('DRAFT')
      qc.invalidateQueries({ queryKey: ['timetable', termId] })
      qc.invalidateQueries({ queryKey: ['conflicts', termId] })
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Generation failed'),
  })

  const publish = useMutation({
    mutationFn: (force: boolean = false) =>
      api.post('/timetable/publish/', { term_id: termId, force }),
    onSuccess: (r) => {
      const published = r.data?.data?.published ?? r.data?.published ?? '?'
      toast.success(`Published ${published} entries`)
      setViewStatus('PUBLISHED')
      qc.invalidateQueries({ queryKey: ['timetable', termId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: any) => {
      const status = e.response?.status
      const msg    = e.response?.data?.error ?? 'Publish failed'
      if (status === 400 && msg.includes('No drafts')) {
        toast.info('Already published — showing published timetable')
        setViewStatus('PUBLISHED')
        qc.invalidateQueries({ queryKey: ['timetable', termId] })
      } else if (status === 409) {
        toast.error(`${msg}`, {
          action: { label: 'Force publish', onClick: () => publish.mutate(true as any) },
        })
      } else {
        toast.error(msg)
      }
    },
  })

  const clearDrafts = useMutation({
    mutationFn: () => api.delete('/timetable/drafts/', { data: { term_id: termId } }),
    onSuccess: () => {
      toast.success('Drafts cleared')
      qc.invalidateQueries({ queryKey: ['timetable', termId] })
    },
    onError: () => toast.error('Failed to clear drafts'),
  })

  // ── Derived — cohort filter ───────────────────────────────────────────────────
  const allEntries: ScheduledUnit[] = []
  for (const dayGrid of Object.values(grid)) {
    for (const periodEntries of Object.values(dayGrid)) {
      if (Array.isArray(periodEntries)) allEntries.push(...periodEntries)
    }
  }
  const cohorts = Array.from(new Map(allEntries.map(e => [e.cohort.id, e.cohort])).values())

  // Build filtered grid
  const filteredGrid: Record<string, Record<string, ScheduledUnit[]>> = {}
  for (const day of days) {
    filteredGrid[day] = {}
    for (const period of periods) {
      const entries = grid[day]?.[period.id] ?? []
      filteredGrid[day][period.id] = selectedCohort === 'ALL'
        ? entries
        : entries.filter(e => e.cohort.id === selectedCohort)
    }
  }

  // ── No term ───────────────────────────────────────────────────────────────────
  if (!termId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <Calendar size={48} className="opacity-30" />
        <p className="text-lg font-medium">No term selected</p>
        <p className="text-sm">Select a term from the top bar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? 'Current Term'} · {display?.total_entries ?? 0} sessions
            {display && display.status !== viewStatus && (
              <span className="ml-2 text-amber-500">(showing {display.status.toLowerCase()})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['DRAFT', 'PUBLISHED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setViewStatus(s)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  viewStatus === s
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => clearDrafts.mutate()}
            disabled={clearDrafts.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear Drafts
          </button>

          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[#1e3a5f] text-[#1e3a5f] rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Generate
          </button>

          <button
            onClick={() => publish.mutate(false as any)}
            disabled={publish.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#162d4a] font-medium disabled:opacity-50"
          >
            {publish.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publish
          </button>
        </div>
      </div>

      {/* Conflict banner */}
      {highConflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {highConflicts.length} HIGH conflict{highConflicts.length > 1 ? 's' : ''} — publish blocked
            </p>
            {highConflicts.slice(0, 3).map(c => (
              <p key={c.id} className="text-xs text-red-600 mt-0.5">{c.description}</p>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Sessions',  value: display?.total_entries ?? 0 },
          { icon: Users,    label: 'Cohorts',   value: cohorts.length },
          { icon: BookOpen, label: 'Conflicts', value: conflicts.length },
          { icon: Home,     label: 'Status',    value: display?.status ?? '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Icon size={13} /> {label}
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Cohort filter */}
      {cohorts.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Filter:</span>
          {[{ id: 'ALL', name: 'All' }, ...cohorts].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCohort(c.id)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                selectedCohort === c.id
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">Failed to load timetable.</div>
      ) : (display?.total_entries ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <Calendar size={48} className="opacity-30" />
          <p className="text-lg font-medium">No sessions scheduled</p>
          <p className="text-sm">Click Generate, then Publish to see the timetable</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 text-left text-xs font-semibold text-gray-500 w-36 border-r border-gray-100">
                  <div className="flex items-center gap-1.5"><Clock size={12} /> Period</div>
                </th>
                {days.map(day => (
                  <th key={day} className="p-3 text-center text-xs font-semibold text-gray-700">
                    {DAY_LABELS[day] ?? day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...periods].sort((a, b) => a.order - b.order).map((period, pi) => (
                <tr key={period.id} className={pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="p-3 border-r border-gray-100 align-top">
                    <p className="text-xs font-semibold text-gray-700">{period.label}</p>
                  </td>
                  {days.map(day => (
                    <td key={day} className="p-2 align-top">
                      <TimetableCell
                        entries={filteredGrid[day]?.[period.id] ?? []}
                        onClick={entry => router.push(`/timetable/${entry.id}`)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> Draft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" /> Published
        </span>
      </div>
    </div>
  )
}


