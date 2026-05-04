'use client'
/**
 * app/(dashboard)/terms/page.tsx
 * ================================
 * College semester timeline + "Move Semester" workflow.
 */

import { useState } from 'react'
import {
  Calendar, ChevronRight, Users, Plus, ArrowRight,
  CheckCircle2, AlertTriangle, GraduationCap, Loader2,
  Info, RefreshCw, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CohortEntry {
  cohort_id: string
  cohort_name: string
  programme: string
  programme_code: string
  programme_term: number
  current_stored_term: number
  is_new_intake: boolean
  is_graduating: boolean
  student_count: number
}

interface SemesterEntry {
  year: number
  semester: 1 | 2 | 3
  label: string
  is_current: boolean
  is_past: boolean
  term: TermRecord | null
  cohorts: CohortEntry[]
  cohort_count: number
  can_advance: boolean
}

interface TermRecord {
  id: string
  name: string
  start_date: string
  end_date: string
  teaching_weeks: number
  is_current: boolean
  college_year: number
  college_semester: number
  current_week: number
  weeks_remaining: number
}

interface CalendarData {
  today: { year: number; semester: number }
  current: SemesterEntry | null
  semesters: SemesterEntry[]
}

interface AdvanceUnit {
  unit_id: string
  code: string
  name: string
  credit_hours: number
  mark_complete: boolean
}

interface AdvancingCohort {
  cohort_id: string
  cohort_name: string
  programme: string
  from_term: number
  to_term: number
  is_graduating: boolean
  student_count: number
  units_to_complete: AdvanceUnit[]
}

interface PreviewData {
  current_term: TermRecord
  next_term: TermRecord | null
  next_term_exists: boolean
  advancing_cohorts: AdvancingCohort[]
  new_intakes: { cohort_id: string; cohort_name: string; programme: string; student_count: number }[]
  graduating_cohorts: { cohort_id: string; cohort_name: string; programme: string }[]
  total_cohorts_advancing: number
  total_new_intakes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = (path: string) => `/api${path}`

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data: T; error?: string }> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token') ?? ''
    : ''
  const res = await fetch(API(path), {
    headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
    ...options,
  })
  return res.json()
}

const SEM_ACCENT: Record<number, { dot: string; ring: string; header: string; badge: string }> = {
  1: { dot: 'bg-blue-400',    ring: 'ring-blue-400',    header: 'bg-blue-50',    badge: 'bg-blue-600 text-white' },
  2: { dot: 'bg-emerald-400', ring: 'ring-emerald-400', header: 'bg-emerald-50', badge: 'bg-emerald-600 text-white' },
  3: { dot: 'bg-violet-400',  ring: 'ring-violet-400',  header: 'bg-violet-50',  badge: 'bg-violet-600 text-white' },
}

function semLabel(year: number, semester: number): string {
  const labels: Record<number, string> = { 1: 'Jan–Apr', 2: 'May–Aug', 3: 'Sep–Dec' }
  return `Sem ${semester} ${year} (${labels[semester]})`
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TermsPage() {
  const [calendar, setCalendar]     = useState<CalendarData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Move-semester modal state
  const [preview, setPreview]       = useState<PreviewData | null>(null)
  const [overrides, setOverrides]   = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<string | null>(null)

  // Create-term modal state
  const [creating, setCreating]   = useState<{ year: number; semester: number } | null>(null)
  const [createBusy, setCreateBusy] = useState(false)

  // ── Load calendar ──────────────────────────────────────────────────────
  const loadCalendar = async () => {
    setLoading(true)
    setError(null)
    const res = await apiFetch<CalendarData>('/calendar/')
    setLoading(false)
    if (res.ok) setCalendar(res.data)
    else setError(res.error ?? 'Failed to load calendar')
  }

  if (!calendar && !loading && !error) loadCalendar()

  // ── Preview move semester ──────────────────────────────────────────────
  const openPreview = async (termId: string) => {
    setPreview(null)
    setOverrides({})
    setConfirmResult(null)
    const res = await apiFetch<PreviewData>('/term/advance-all/', {
      method: 'POST',
      body: JSON.stringify({ phase: 'preview', term_id: termId }),
    })
    if (res.ok) setPreview(res.data)
    else alert(res.error ?? 'Preview failed')
  }

  // ── Confirm move semester ──────────────────────────────────────────────
  const confirmAdvance = async () => {
    if (!preview) return
    setConfirming(true)
    const res = await apiFetch<{ cohorts_advanced: number; units_completed: number; next_term: TermRecord | null }>('/term/advance-all/', {
      method: 'POST',
      body: JSON.stringify({ phase: 'confirm', term_id: preview.current_term.id, overrides }),
    })
    setConfirming(false)
    if (res.ok) {
      const d = res.data
      setConfirmResult(
        `Moved to ${d.next_term?.name ?? 'next semester'}. ` +
        `${d.cohorts_advanced} cohorts advanced, ${d.units_completed} units completed.`
      )
      setPreview(null)
      loadCalendar()
    } else {
      alert(res.error ?? 'Confirm failed')
    }
  }

  // ── Create next term ───────────────────────────────────────────────────
  const createTerm = async () => {
    if (!creating) return
    setCreateBusy(true)
    const res = await apiFetch<TermRecord>('/terms/', {
      method: 'POST',
      body: JSON.stringify({
        college_year:     creating.year,
        college_semester: creating.semester,
        teaching_weeks:   14,
        is_current:       false,
      }),
    })
    setCreateBusy(false)
    if (res.ok) { setCreating(null); loadCalendar() }
    else alert(res.error ?? 'Create failed')
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5 text-[#1e3a5f]" />
            </div>
            Academic Calendar
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 pl-10.5">
            3 semesters per year · Jan–Apr · May–Aug · Sep–Dec
          </p>
        </div>
        <button
          onClick={loadCalendar}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 active:scale-[.97] transition-all shrink-0"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Confirm result banner */}
      {confirmResult && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <div className="h-6 w-6 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <span className="font-medium">{confirmResult}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Semester timeline */}
      {calendar && (
        <div className="space-y-3">
          {calendar.semesters.map(sem => {
            const accent    = SEM_ACCENT[sem.semester]
            const isPast    = sem.is_past
            const isCurrent = sem.is_current
            const newIntakes = sem.cohorts.filter(c => c.is_new_intake)
            const graduating = sem.cohorts.filter(c => c.is_graduating)
            const regular    = sem.cohorts.filter(c => !c.is_new_intake && !c.is_graduating)

            return (
              <div
                key={`${sem.year}-${sem.semester}`}
                className={cn(
                  'rounded-2xl border bg-white transition-all overflow-hidden',
                  isCurrent
                    ? `ring-2 ${accent.ring} border-transparent shadow-lg`
                    : 'border-gray-200',
                  isPast && 'opacity-55',
                )}
              >
                {/* Semester header */}
                <div className={cn(
                  'flex items-center justify-between px-5 py-3',
                  isCurrent ? accent.header : 'bg-gray-50',
                )}>
                  <div className="flex items-center gap-3">
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', accent.dot)} />
                    <span className="text-sm font-bold text-gray-800">{sem.label}</span>
                    {isCurrent && (
                      <span className={cn('text-xs rounded-full px-2.5 py-0.5 font-semibold', accent.badge)}>
                        Current
                      </span>
                    )}
                    {sem.term && (
                      <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                        {sem.term.name}
                        {sem.term.current_week > 0 ? ` · Week ${sem.term.current_week}` : ''}
                        {sem.term.weeks_remaining > 0 ? ` · ${sem.term.weeks_remaining}w left` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* No term yet → create */}
                    {!sem.term && !isPast && (
                      <button
                        onClick={() => setCreating({ year: sem.year, semester: sem.semester })}
                        className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-full px-2.5 py-0.5 hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Create term
                      </button>
                    )}

                    {/* Move semester */}
                    {sem.can_advance && (
                      <button
                        onClick={() => openPreview(sem.term!.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#1e3a5f] text-white rounded-full px-3 py-1.5 hover:bg-[#162d4a] active:scale-[.97] transition-all"
                      >
                        Move Semester <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cohort pills */}
                {sem.cohort_count > 0 && (
                  <div className="px-5 py-4 space-y-2.5">
                    {newIntakes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newIntakes.map(c => <CohortPill key={c.cohort_id} cohort={c} variant="new" />)}
                      </div>
                    )}
                    {regular.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {regular.map(c => <CohortPill key={c.cohort_id} cohort={c} variant="regular" />)}
                      </div>
                    )}
                    {graduating.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {graduating.map(c => <CohortPill key={c.cohort_id} cohort={c} variant="graduating" />)}
                      </div>
                    )}
                  </div>
                )}

                {sem.cohort_count === 0 && !isPast && (
                  <p className="px-5 py-4 text-xs text-gray-400 italic">
                    No active cohorts in this semester yet.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Move Semester Modal ── */}
      {preview && (
        <Modal onClose={() => setPreview(null)}>
          <div className="space-y-5">
            {/* Modal header */}
            <div>
              <h2 className="text-lg font-bold text-gray-800">Move Semester</h2>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                <span className="font-medium text-gray-700">{preview.current_term.name}</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">
                  {preview.next_term?.name ?? '(no next term yet)'}
                </span>
              </p>
            </div>

            {/* Warning: no next term */}
            {!preview.next_term_exists && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  No term record exists for the next semester. Create it first using the
                  "Create term" button on the calendar before confirming.
                </span>
              </div>
            )}

            {/* New intakes */}
            {preview.new_intakes.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                  New intakes joining ({preview.new_intakes.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {preview.new_intakes.map(c => (
                    <span key={c.cohort_id}
                      className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 ring-1 ring-emerald-200 font-semibold">
                      {c.cohort_name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Advancing cohorts */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Cohorts advancing ({preview.total_cohorts_advancing})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {preview.advancing_cohorts.map(cohort => (
                  <div key={cohort.cohort_id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      {cohort.is_graduating
                        ? <GraduationCap className="h-4 w-4 text-violet-500 shrink-0" />
                        : <Users className="h-4 w-4 text-blue-500 shrink-0" />}
                      <span className="text-sm font-semibold text-gray-800">{cohort.cohort_name}</span>
                      <span className="text-xs text-gray-400 font-mono ml-auto tabular-nums">
                        T{cohort.from_term} → T{cohort.to_term}
                        {cohort.is_graduating ? ' · graduating' : ''}
                      </span>
                    </div>
                    {cohort.units_to_complete.length > 0 ? (
                      <div className="space-y-1.5">
                        {cohort.units_to_complete.map(u => (
                          <label key={u.unit_id}
                            className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/30"
                              checked={overrides[u.unit_id] !== false && u.mark_complete}
                              disabled={!u.mark_complete}
                              onChange={e => setOverrides(prev => ({ ...prev, [u.unit_id]: e.target.checked }))}
                            />
                            <code className="font-mono text-gray-500 shrink-0">{u.code}</code>
                            <span className="flex-1">{u.name}</span>
                            {!u.mark_complete && (
                              <span className="text-amber-500 shrink-0">not on timetable</span>
                            )}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No units to complete.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setPreview(null)}
                className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdvance}
                disabled={confirming || !preview.next_term_exists}
                className="flex items-center gap-2 text-sm font-semibold bg-[#1e3a5f] text-white rounded-xl px-5 py-2.5 hover:bg-[#162d4a] disabled:opacity-50 active:scale-[.98] transition-all"
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm — Move Semester
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Term Modal ── */}
      {creating && (
        <Modal onClose={() => setCreating(null)}>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Create Term Record</h2>
            <p className="text-sm text-gray-600">
              This will create a new term for{' '}
              <strong className="text-gray-800">{semLabel(creating.year, creating.semester)}</strong>.
              Dates are set automatically from the college calendar.
            </p>
            <div className="flex items-start gap-3 rounded-2xl bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 px-4 py-3 text-sm text-[#1e3a5f]">
              <Info className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
              <span>
                After creating the term you can run Generate to build the timetable,
                then use "Move Semester" to activate it.
              </span>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setCreating(null)}
                className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTerm}
                disabled={createBusy}
                className="flex items-center gap-2 text-sm font-semibold bg-[#1e3a5f] text-white rounded-xl px-5 py-2.5 hover:bg-[#162d4a] disabled:opacity-50 active:scale-[.98] transition-all"
              >
                {createBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Term
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CohortPill({ cohort, variant }: {
  cohort: CohortEntry
  variant: 'new' | 'regular' | 'graduating'
}) {
  const styles = {
    new:        'bg-emerald-50 ring-emerald-200 text-emerald-800',
    regular:    'bg-gray-50 ring-gray-200 text-gray-700',
    graduating: 'bg-violet-50 ring-violet-200 text-violet-800',
  }
  const icons = {
    new:        <Plus className="h-3 w-3 shrink-0" />,
    regular:    null,
    graduating: <GraduationCap className="h-3 w-3 shrink-0" />,
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-xs font-semibold',
      styles[variant],
    )}>
      {icons[variant]}
      <span>{cohort.cohort_name}</span>
      <span className="opacity-50 font-mono tabular-nums">T{cohort.programme_term}</span>
      {cohort.student_count > 0 && (
        <span className="opacity-40 tabular-nums">{cohort.student_count}</span>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}