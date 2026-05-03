'use client'

/**
 * AdvanceTermModal.tsx  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-mode modal: Browse + Advance.
 *
 * BROWSE MODE
 *   Switch year (2022–2028) and semester (1 Jan / 2 May / 3 Sep) to see
 *   exactly which curriculum units each cohort was studying at that point.
 *   Each cohort's term is computed from start_year + start_month so the view
 *   is historically accurate.  Mismatched cohorts (computed ≠ current_term)
 *   are highlighted with a badge.
 *
 * ADVANCE MODE
 *   Original functionality preserved exactly:
 *   1. GET /api/term/advance-all/?term=<id>  → preview (uses current_term)
 *   2. Shows checkboxes — user can uncheck units they don't want completed
 *   3. POST /api/term/advance-all/ { phase:"confirm", overrides }  → advance
 *   4. Invalidates cohort + timetable + dashboard queries on success
 *
 * Backend receives year + semester params in preview calls so it can serve
 * the historically-accurate unit list per cohort.
 *
 * Usage:
 *   <AdvanceTermModal termId={currentTermId} termName={currentTermName} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnitPreview {
  unit_id: string
  code: string
  name: string
  credit_hours: number
  mark_complete: boolean
}

interface CohortPreview {
  cohort_id: string
  cohort_name: string
  programme: string
  programme_code: string
  current_term: number
  from_term: number
  to_term: number
  can_advance: boolean
  term_is_synced: boolean
  computed_current_term: number
  computed_term_at_point: number
  units_to_complete: UnitPreview[]
}

interface PreviewData {
  term_id: string
  term_name: string
  year: number | null
  semester: number | null
  browse_mode: boolean
  cohorts: CohortPreview[]
  total_cohorts: number
}

interface ConfirmResult {
  cohorts_advanced: number
  units_completed: number
  skipped_units: number
  detail: string[]
}

type ModalMode = 'browse' | 'advance'

// ── Constants ─────────────────────────────────────────────────────────────────

const SEMESTER_LABELS: Record<number, string> = {
  1: 'Sem 1 · Jan',
  2: 'Sem 2 · May',
  3: 'Sem 3 · Sep',
}

const MIN_YEAR = 2022
const MAX_YEAR = 2028

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchPreview = (
  termId: string,
  year?: number,
  semester?: number
): Promise<PreviewData> => {
  const params = new URLSearchParams({ term: termId })
  if (year)     params.set('year',     String(year))
  if (semester) params.set('semester', String(semester))
  return api.get(`/term/advance-all/?${params}`).then((r) => r.data.data)
}

const confirmAdvance = (
  termId: string,
  overrides: Record<string, boolean>
): Promise<ConfirmResult> =>
  api
    .post('/term/advance-all/', { term_id: termId, phase: 'confirm', overrides })
    .then((r) => r.data.data)

// ── Seed overrides from server mark_complete ──────────────────────────────────

function seedOverrides(cohorts: CohortPreview[]): Record<string, boolean> {
  const seed: Record<string, boolean> = {}
  for (const cohort of cohorts) {
    for (const unit of cohort.units_to_complete) {
      if (!unit.mark_complete) {
        seed[unit.unit_id] = false
      }
    }
  }
  return seed
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const FastForwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

// ── Sub-components ────────────────────────────────────────────────────────────

function UnitRow({
  unit,
  checked,
  onChange,
  browseMode,
}: {
  unit: UnitPreview
  checked: boolean
  onChange: (id: string, val: boolean) => void
  browseMode: boolean
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 py-2 px-3 rounded-lg group',
        browseMode ? 'cursor-default' : 'hover:bg-slate-50 cursor-pointer'
      )}
    >
      {browseMode ? (
        // Browse mode — static dot indicator
        <span className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 shrink-0" />
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(unit.unit_id, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#1e3a5f] cursor-pointer shrink-0"
        />
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-slate-800 font-mono tracking-tight">
          {unit.code}
        </span>
        <span className="block text-xs text-slate-500 leading-snug">{unit.name}</span>
      </span>
      <span className="text-[10px] font-medium text-slate-400 mt-0.5 shrink-0">
        {unit.credit_hours} CH
      </span>
    </label>
  )
}

function CohortCard({
  cohort,
  overrides,
  onToggleUnit,
  onToggleAll,
  mode,
}: {
  cohort: CohortPreview
  overrides: Record<string, boolean>
  onToggleUnit: (unitId: string, val: boolean) => void
  onToggleAll: (cohort: CohortPreview, val: boolean) => void
  mode: ModalMode
}) {
  const isBrowse   = mode === 'browse'
  const allChecked = cohort.units_to_complete.every((u) => overrides[u.unit_id] !== false)
  const isMismatch = !cohort.term_is_synced

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isMismatch && !isBrowse
        ? 'border-amber-200'
        : 'border-slate-200'
    )}>
      {/* Card header */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 border-b',
        isMismatch && !isBrowse
          ? 'bg-amber-50 border-amber-200'
          : 'bg-slate-50 border-slate-200'
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">{cohort.cohort_name}</p>
            {/* Sync mismatch badge */}
            {isMismatch && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 text-amber-800">
                needs sync
              </span>
            )}
            {/* Browse mode — show if cohort had not yet started */}
            {isBrowse && cohort.computed_term_at_point !== cohort.current_term && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                Term {cohort.computed_term_at_point} at this date
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{cohort.programme}</p>
        </div>

        {/* Term progression badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
            Term {cohort.from_term}
          </span>
          {!isBrowse && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                Term {cohort.to_term}
              </span>
            </>
          )}
        </div>

        {/* Toggle all — advance mode only */}
        {!isBrowse && cohort.units_to_complete.length > 0 && (
          <button
            onClick={() => onToggleAll(cohort, !allChecked)}
            className="text-xs text-[#1e3a5f] font-medium hover:underline shrink-0"
          >
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        )}
      </div>

      {/* Units list */}
      {cohort.units_to_complete.length > 0 ? (
        <div className={cn('px-2 py-1', !isBrowse && 'divide-y divide-slate-100')}>
          {cohort.units_to_complete.map((unit) => (
            <UnitRow
              key={unit.unit_id}
              unit={unit}
              checked={overrides[unit.unit_id] !== false}
              onChange={onToggleUnit}
              browseMode={isBrowse}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-xs text-slate-400 italic">
          {isBrowse
            ? 'No curriculum units defined for this term.'
            : 'No scheduled units found — cohort will still advance.'}
        </p>
      )}
    </div>
  )
}

// ── Year + Semester switcher ──────────────────────────────────────────────────

function PeriodSwitcher({
  year,
  semester,
  onYearChange,
  onSemesterChange,
}: {
  year: number
  semester: number
  onYearChange: (y: number) => void
  onSemesterChange: (s: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Year control */}
      <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
        <button
          onClick={() => onYearChange(Math.max(MIN_YEAR, year - 1))}
          disabled={year <= MIN_YEAR}
          className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-3 py-1.5 text-sm font-semibold text-slate-800 border-x border-slate-200 min-w-[56px] text-center tabular-nums">
          {year}
        </span>
        <button
          onClick={() => onYearChange(Math.min(MAX_YEAR, year + 1))}
          disabled={year >= MAX_YEAR}
          className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Semester pills */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => onSemesterChange(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
              semester === s
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {SEMESTER_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({ result, onClose }: { result: ConfirmResult; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckIcon className="w-8 h-8 text-emerald-600" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900">Term advanced successfully</h3>
        <p className="text-sm text-slate-500 mt-1">All active cohorts have moved to their next term</p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { label: 'Cohorts advanced', value: result.cohorts_advanced, color: 'text-[#1e3a5f]' },
          { label: 'Units completed',  value: result.units_completed,  color: 'text-emerald-600' },
          { label: 'Units skipped',    value: result.skipped_units,    color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-xl bg-slate-50 py-3 px-2">
            <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {result.detail.length > 0 && (
        <details className="w-full text-xs text-slate-500">
          <summary className="cursor-pointer select-none font-medium">View detail log</summary>
          <ul className="mt-2 space-y-1 pl-2">
            {result.detail.map((line, i) => (
              <li key={i} className="before:content-['·'] before:mr-1">{line}</li>
            ))}
          </ul>
        </details>
      )}
      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ── Main modal component ──────────────────────────────────────────────────────

interface AdvanceTermModalProps {
  termId: string
  termName?: string
}

export default function AdvanceTermModal({ termId, termName }: AdvanceTermModalProps) {
  const now = new Date()

  // Semester derived from current month: Jan-Apr→1, May-Aug→2, Sep-Dec→3
  const currentSemester = now.getMonth() < 4 ? 1 : now.getMonth() < 8 ? 2 : 3

  const [open, setOpen]             = useState(false)
  const [mode, setMode]             = useState<ModalMode>('browse')
  const [year, setYear]             = useState(now.getFullYear())
  const [semester, setSemester]     = useState(currentSemester)
  const [overrides, setOverrides]   = useState<Record<string, boolean>>({})
  const [result, setResult]         = useState<ConfirmResult | null>(null)
  const queryClient                 = useQueryClient()

  // ── Preview query ─────────────────────────────────────────────────────────
  // In browse mode  → sends year + semester so backend returns units at that point
  // In advance mode → sends no year/semester so backend uses current_term
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery<PreviewData>({
    queryKey: ['term-advance-preview', termId, mode, mode === 'browse' ? year : null, mode === 'browse' ? semester : null],
    queryFn: () =>
      mode === 'browse'
        ? fetchPreview(termId, year, semester)
        : fetchPreview(termId),
    enabled: open && !result,
    staleTime: 0,
  })

  // Seed overrides when advance mode preview arrives
  useEffect(() => {
    if (preview && mode === 'advance') {
      setOverrides(seedOverrides(preview.cohorts))
    }
  }, [preview, mode])

  // ── Confirm mutation ───────────────────────────────────────────────────────
  const { mutate: confirm, isPending: confirming } = useMutation({
    mutationFn: () => confirmAdvance(termId, overrides),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['cohorts'] })
      queryClient.invalidateQueries({ queryKey: ['master-timetable'] })
      queryClient.invalidateQueries({ queryKey: ['cohort-progress'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpen = () => {
    setOpen(true)
    setResult(null)
    setOverrides({})
    setMode('browse')
  }

  const handleClose = () => {
    setOpen(false)
    setResult(null)
    setOverrides({})
  }

  const handleModeChange = (m: ModalMode) => {
    setMode(m)
    setOverrides({})
    setResult(null)
  }

  const handleToggleUnit = useCallback((unitId: string, val: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (val) { delete next[unitId] } else { next[unitId] = false }
      return next
    })
  }, [])

  const handleToggleAll = useCallback((cohort: CohortPreview, val: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev }
      for (const u of cohort.units_to_complete) {
        if (val) { delete next[u.unit_id] } else { next[u.unit_id] = false }
      }
      return next
    })
  }, [])

  const skippedCount = Object.values(overrides).filter((v) => v === false).length
  const mismatchCount = preview?.cohorts.filter((c) => !c.term_is_synced).length ?? 0

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
          'bg-[#1e3a5f] text-white hover:bg-[#16304f] shadow-sm'
        )}
      >
        <FastForwardIcon className="w-4 h-4" />
        Advance Term
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* ── Header ── */}
            {!result && (
              <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {mode === 'browse' ? 'Cohort curriculum by semester' : 'Advance all cohorts'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {mode === 'browse'
                        ? 'Browse which units each cohort was studying at any point in time.'
                        : termName
                        ? `End of ${termName} — mark units complete and move all cohorts forward.`
                        : 'Mark units complete and move all cohorts to their next term.'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-3">
                  {(['browse', 'advance'] as ModalMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                        mode === m
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {m === 'browse' ? 'Browse' : 'Advance'}
                    </button>
                  ))}
                </div>

                {/* Year + semester switcher — browse mode only */}
                {mode === 'browse' && (
                  <PeriodSwitcher
                    year={year}
                    semester={semester}
                    onYearChange={setYear}
                    onSemesterChange={setSemester}
                  />
                )}

                {/* Mismatch warning — advance mode only */}
                {mode === 'advance' && mismatchCount > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                    <span className="font-semibold">{mismatchCount} cohort{mismatchCount > 1 ? 's' : ''}</span>
                    <span>ha{mismatchCount === 1 ? 's' : 've'} a term mismatch. Switch to Browse to investigate.</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {/* Result screen */}
              {result && <ResultScreen result={result} onClose={handleClose} />}

              {/* Loading */}
              {!result && previewLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#1e3a5f] animate-spin" />
                  <p className="text-sm">Loading cohort data…</p>
                </div>
              )}

              {/* Error */}
              {!result && previewError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  Failed to load. Check your connection and try again.
                </div>
              )}

              {/* Browse mode info banner */}
              {!result && preview && mode === 'browse' && (
                <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
                  Showing curriculum for <strong>{year}</strong> Semester <strong>{semester}</strong>.
                  Each cohort's term is computed from their intake date.
                  {mismatchCount > 0 && (
                    <span className="ml-1">
                      <strong>{mismatchCount}</strong> cohort{mismatchCount > 1 ? 's have' : ' has'} a mismatch between stored and computed term.
                    </span>
                  )}
                </div>
              )}

              {/* Advance mode info banner */}
              {!result && preview && mode === 'advance' && (
                <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                  <p className="font-semibold">Review before confirming</p>
                  <p className="mt-0.5 opacity-80">
                    Checked units will be marked <strong>Completed</strong>.
                    Uncheck any unit to keep it as In Progress or handle manually.
                  </p>
                </div>
              )}

              {/* No cohorts */}
              {!result && preview && preview.cohorts.length === 0 && (
                <p className="text-center text-slate-500 py-8 text-sm">
                  {mode === 'browse'
                    ? 'No cohorts were active in this period.'
                    : 'No active cohorts are eligible to advance right now.'}
                </p>
              )}

              {/* Cohort cards */}
              {!result && preview && (
                <div className="space-y-3">
                  {preview.cohorts.map((cohort) => (
                    <CohortCard
                      key={cohort.cohort_id}
                      cohort={cohort}
                      overrides={overrides}
                      onToggleUnit={handleToggleUnit}
                      onToggleAll={handleToggleAll}
                      mode={mode}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            {!result && preview && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 shrink-0 bg-slate-50 gap-3">
                <div className="text-xs text-slate-500 min-w-0">
                  {mode === 'browse' ? (
                    <span>{preview.total_cohorts} cohort{preview.total_cohorts !== 1 ? 's' : ''} active · {year} Sem {semester}</span>
                  ) : skippedCount > 0 ? (
                    <span className="text-amber-600 font-medium">
                      {skippedCount} unit{skippedCount > 1 ? 's' : ''} will be skipped
                    </span>
                  ) : (
                    <span>{preview.total_cohorts} cohort{preview.total_cohorts !== 1 ? 's' : ''} will advance</span>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {mode === 'browse' ? 'Close' : 'Cancel'}
                  </button>
                  {mode === 'advance' && (
                    <button
                      onClick={() => confirm()}
                      disabled={confirming || preview.cohorts.length === 0}
                      className={cn(
                        'px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                        'bg-[#1e3a5f] text-white hover:bg-[#16304f]',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {confirming ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Advancing…
                        </span>
                      ) : (
                        'Advance & confirm'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}