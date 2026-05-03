'use client'
/**
 * app/(dashboard)/terms/page.tsx
 * ================================
 * College semester timeline + "Move Semester" workflow.
 *
 * Features:
 *  - Visual timeline of past / current / upcoming semesters
 *  - Shows which cohorts are active each semester and their programme term
 *  - "Create Next Term" button if the next semester has no Term record yet
 *  - "Move Semester" button that runs the two-phase advance flow
 *  - New intakes and graduating cohorts highlighted
 *
 * API calls used:
 *  GET  /api/calendar/                   → semester overview
 *  POST /api/terms/                      → create new term
 *  POST /api/term/advance-all/           → preview + confirm
 */

import { useState } from 'react'
import {
  Calendar, ChevronRight, Users, Plus, ArrowRight,
  CheckCircle2, AlertTriangle, GraduationCap, Loader2,
  Info,
} from 'lucide-react'

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

const SEM_COLORS: Record<number, string> = {
  1: 'bg-blue-100 border-blue-300 text-blue-800',
  2: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  3: 'bg-purple-100 border-purple-300 text-purple-800',
}
const SEM_DOT: Record<number, string> = {
  1: 'bg-blue-400',
  2: 'bg-emerald-400',
  3: 'bg-purple-400',
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TermsPage() {
  const [calendar, setCalendar]   = useState<CalendarData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Move-semester modal state
  const [preview, setPreview]     = useState<PreviewData | null>(null)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
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

  // Run on first render
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
      body: JSON.stringify({
        phase:     'confirm',
        term_id:   preview.current_term.id,
        overrides,
      }),
    })
    setConfirming(false)
    if (res.ok) {
      const d = res.data
      setConfirmResult(
        `✓ Moved to ${d.next_term?.name ?? 'next semester'}. ` +
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
    if (res.ok) {
      setCreating(null)
      loadCalendar()
    } else {
      alert(res.error ?? 'Create failed')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Academic Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            3 semesters per year · Jan–Apr · May–Aug · Sep–Dec
          </p>
        </div>
        <button
          onClick={loadCalendar}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          Refresh
        </button>
      </div>

      {/* Confirm result banner */}
      {confirmResult && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {confirmResult}
        </div>
      )}

      {/* Loading / error */}
      {loading && <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />}
      {error   && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Semester timeline */}
      {calendar && (
        <div className="space-y-3">
          {calendar.semesters.map(sem => {
            const isPast    = sem.is_past
            const isCurrent = sem.is_current
            const hasTerm   = !!sem.term
            const newIntakes    = sem.cohorts.filter(c => c.is_new_intake)
            const graduating    = sem.cohorts.filter(c => c.is_graduating)
            const regular       = sem.cohorts.filter(c => !c.is_new_intake && !c.is_graduating)

            return (
              <div
                key={`${sem.year}-${sem.semester}`}
                className={`
                  rounded-2xl border transition-all
                  ${isCurrent  ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-gray-200'}
                  ${isPast     ? 'opacity-60' : ''}
                  bg-white
                `}
              >
                {/* Semester header */}
                <div className={`
                  flex items-center justify-between px-5 py-3 rounded-t-2xl
                  ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}
                `}>
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${SEM_DOT[sem.semester]}`} />
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{sem.label}</span>
                      {isCurrent && (
                        <span className="ml-2 text-xs rounded-full bg-blue-600 text-white px-2 py-0.5">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Term status */}
                    {hasTerm ? (
                      <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                        {sem.term!.name}
                        {sem.term!.is_current ? ' · active' : ''}
                      </span>
                    ) : (
                      !isPast && (
                        <button
                          onClick={() => setCreating({ year: sem.year, semester: sem.semester })}
                          className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-full px-2.5 py-0.5 hover:bg-blue-50"
                        >
                          <Plus className="h-3 w-3" /> Create term
                        </button>
                      )
                    )}

                    {/* Move semester button */}
                    {sem.can_advance && (
                      <button
                        onClick={() => openPreview(sem.term!.id)}
                        className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 text-white rounded-full px-3 py-1 hover:bg-blue-700"
                      >
                        Move Semester <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cohort grid */}
                {sem.cohort_count > 0 && (
                  <div className="px-5 py-4 space-y-2">
                    {/* New intakes */}
                    {newIntakes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newIntakes.map(c => (
                          <CohortPill key={c.cohort_id} cohort={c} variant="new" />
                        ))}
                      </div>
                    )}
                    {/* Regular */}
                    {regular.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {regular.map(c => (
                          <CohortPill key={c.cohort_id} cohort={c} variant="regular" />
                        ))}
                      </div>
                    )}
                    {/* Graduating */}
                    {graduating.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {graduating.map(c => (
                          <CohortPill key={c.cohort_id} cohort={c} variant="graduating" />
                        ))}
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
            <div>
              <h2 className="text-lg font-bold text-gray-900">Move Semester</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {preview.current_term.name}
                <ChevronRight className="h-3.5 w-3.5 inline mx-1" />
                {preview.next_term?.name ?? '(no next term created yet)'}
              </p>
            </div>

            {!preview.next_term_exists && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  No term record exists for the next semester. Create it first
                  (the "Create term" button on the calendar) before confirming.
                </span>
              </div>
            )}

            {/* New intakes */}
            {preview.new_intakes.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                  New intakes joining next semester ({preview.new_intakes.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {preview.new_intakes.map(c => (
                    <span key={c.cohort_id}
                      className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 border border-emerald-200">
                      {c.cohort_name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Advancing cohorts + units */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Cohorts advancing ({preview.total_cohorts_advancing})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {preview.advancing_cohorts.map(cohort => (
                  <div key={cohort.cohort_id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      {cohort.is_graduating
                        ? <GraduationCap className="h-4 w-4 text-purple-500" />
                        : <Users className="h-4 w-4 text-blue-500" />}
                      <span className="text-sm font-medium text-gray-900">{cohort.cohort_name}</span>
                      <span className="text-xs text-gray-400">
                        T{cohort.from_term} → T{cohort.to_term}
                        {cohort.is_graduating ? ' (graduating)' : ''}
                      </span>
                    </div>
                    {cohort.units_to_complete.length > 0 && (
                      <div className="space-y-1">
                        {cohort.units_to_complete.map(u => (
                          <label key={u.unit_id}
                            className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={overrides[u.unit_id] !== false && u.mark_complete}
                              disabled={!u.mark_complete}
                              onChange={e => {
                                setOverrides(prev => ({
                                  ...prev,
                                  [u.unit_id]: e.target.checked,
                                }))
                              }}
                            />
                            <span className="font-mono text-gray-500">{u.code}</span>
                            {u.name}
                            {!u.mark_complete && (
                              <span className="text-amber-500 text-xs">(not on timetable)</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    {cohort.units_to_complete.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No units to complete.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setPreview(null)}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdvance}
                disabled={confirming || !preview.next_term_exists}
                className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white rounded-xl px-5 py-2 hover:bg-blue-700 disabled:opacity-50"
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
            <h2 className="text-lg font-bold text-gray-900">Create Term Record</h2>
            <p className="text-sm text-gray-600">
              This will create a new Term for{' '}
              <strong>{semLabel(creating.year, creating.semester)}</strong>.
              Dates are set automatically from the college calendar.
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                After creating the term you can run Generate to build the timetable,
                then use "Move Semester" to activate it.
              </span>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setCreating(null)}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={createTerm}
                disabled={createBusy}
                className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white rounded-xl px-5 py-2 hover:bg-blue-700 disabled:opacity-50"
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
    new:        'bg-emerald-50 border-emerald-200 text-emerald-800',
    regular:    'bg-gray-50 border-gray-200 text-gray-700',
    graduating: 'bg-purple-50 border-purple-200 text-purple-800',
  }
  const icons = {
    new:        <Plus className="h-3 w-3" />,
    regular:    null,
    graduating: <GraduationCap className="h-3 w-3" />,
  }

  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${styles[variant]}`}>
      {icons[variant]}
      <span className="font-medium">{cohort.cohort_name}</span>
      <span className="opacity-60">T{cohort.programme_term}</span>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg leading-none"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

function semLabel(year: number, semester: number): string {
  const labels: Record<number, string> = { 1: 'Jan–Apr', 2: 'May–Aug', 3: 'Sep–Dec' }
  return `Sem ${semester} ${year} (${labels[semester]})`
}