'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnitPreview {
  unit_id: string
  code: string
  name: string
  credit_hours: number
  mark_complete: boolean
}

interface CohortPreview {
  enrolment_id: string
  cohort_id: string
  cohort_name: string
  programme: string
  programme_code: string
  from_term: number
  to_term: number
  is_graduating: boolean
  student_count: number
  units_to_complete: UnitPreview[]
  term_is_synced?: boolean
  computed_current_term?: number
  computed_term_at_point?: number
  current_term?: number
}

interface PreviewData {
  current_term: Record<string, any>
  next_term: Record<string, any> | null
  next_term_exists: boolean
  advancing_cohorts: CohortPreview[]
  new_intakes: any[]
  graduating_cohorts: any[]
  total_cohorts_advancing: number
  total_new_intakes: number
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
  1: 'Sem 1',
  2: 'Sem 2',
  3: 'Sem 3',
}

const MIN_YEAR = 2022
const MAX_YEAR = 2028

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchPreview = (termId: string, year?: number, semester?: number): Promise<PreviewData> => {
  const params = new URLSearchParams({ term: termId })
  if (year)     params.set('year',     String(year))
  if (semester) params.set('semester', String(semester))
  return api.get(`/term/advance-all/?${params}`).then((r) => r.data.data)
}

const confirmAdvance = (termId: string, overrides: Record<string, boolean>): Promise<ConfirmResult> =>
  api.post('/term/advance-all/', { term_id: termId, phase: 'confirm', overrides }).then((r) => r.data.data)

function seedOverrides(cohorts: CohortPreview[]): Record<string, boolean> {
  const seed: Record<string, boolean> = {}
  for (const cohort of cohorts)
    for (const unit of cohort.units_to_complete ?? [])
      if (!unit.mark_complete) seed[unit.unit_id] = false
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

// ── UnitRow ───────────────────────────────────────────────────────────────────

function UnitRow({ unit, checked, onChange, browseMode }: {
  unit: UnitPreview
  checked: boolean
  onChange: (id: string, val: boolean) => void
  browseMode: boolean
}) {
  return (
    <label className={cn(
      'flex items-start gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg group',
      browseMode ? 'cursor-default' : 'hover:bg-slate-50 cursor-pointer'
    )}>
      {browseMode
        ? <span className="mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-300 shrink-0" />
        : <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(unit.unit_id, e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-slate-300 accent-[#1e3a5f] cursor-pointer shrink-0"
          />
      }
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] sm:text-xs font-semibold text-slate-800 font-mono tracking-tight">{unit.code}</span>
        <span className="block text-[10px] sm:text-xs text-slate-500 leading-snug truncate">{unit.name}</span>
      </span>
      <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-0.5 shrink-0">{unit.credit_hours} CH</span>
    </label>
  )
}

// ── CohortCard ────────────────────────────────────────────────────────────────

function CohortCard({ cohort, overrides, onToggleUnit, onToggleAll, mode }: {
  cohort: CohortPreview
  overrides: Record<string, boolean>
  onToggleUnit: (unitId: string, val: boolean) => void
  onToggleAll: (cohort: CohortPreview, val: boolean) => void
  mode: ModalMode
}) {
  const isBrowse   = mode === 'browse'
  const units      = cohort.units_to_complete ?? []
  const allChecked = units.every((u) => overrides[u.unit_id] !== false)
  const isMismatch = cohort.term_is_synced === false

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isMismatch && !isBrowse ? 'border-amber-200' : 'border-slate-200'
    )}>
      {/* Card header */}
      <div className={cn(
        'px-3 sm:px-4 py-2.5 sm:py-3 border-b',
        isMismatch && !isBrowse ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
      )}>
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{cohort.cohort_name}</p>
              {isMismatch && (
                <span className="px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-amber-200 text-amber-800 shrink-0">
                  sync needed
                </span>
              )}
              {cohort.is_graduating && (
                <span className="px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-purple-100 text-purple-700 shrink-0">
                  graduating
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{cohort.programme}</p>
          </div>

          {/* Term arrow */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-100 text-amber-700">
              T{cohort.from_term}
            </span>
            {!isBrowse && (
              <>
                <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                  T{cohort.to_term}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Check all button */}
        {!isBrowse && units.length > 0 && (
          <button
            onClick={() => onToggleAll(cohort, !allChecked)}
            className="mt-1.5 text-[10px] sm:text-xs text-[#1e3a5f] font-medium hover:underline"
          >
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        )}
      </div>

      {/* Units list */}
      {units.length > 0
        ? <div className={cn('px-1 sm:px-2 py-0.5 sm:py-1', !isBrowse && 'divide-y divide-slate-100')}>
            {units.map((unit) => (
              <UnitRow
                key={unit.unit_id}
                unit={unit}
                checked={overrides[unit.unit_id] !== false}
                onChange={onToggleUnit}
                browseMode={isBrowse}
              />
            ))}
          </div>
        : <p className="px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-slate-400 italic">
            {isBrowse ? 'No curriculum units defined for this term.' : 'No scheduled units — cohort will still advance.'}
          </p>
      }
    </div>
  )
}

// ── PeriodSwitcher ────────────────────────────────────────────────────────────

function PeriodSwitcher({ year, semester, onYearChange, onSemesterChange }: {
  year: number
  semester: number
  onYearChange: (y: number) => void
  onSemesterChange: (s: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Year stepper */}
      <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
        <button
          onClick={() => onYearChange(Math.max(MIN_YEAR, year - 1))}
          disabled={year <= MIN_YEAR}
          className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
        <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-slate-800 border-x border-slate-200 min-w-[48px] sm:min-w-[56px] text-center tabular-nums">
          {year}
        </span>
        <button
          onClick={() => onYearChange(Math.min(MAX_YEAR, year + 1))}
          disabled={year >= MAX_YEAR}
          className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      {/* Semester tabs */}
      <div className="flex gap-1 sm:gap-1.5">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => onSemesterChange(s)}
            className={cn(
              'px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors border',
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

// ── ResultScreen ──────────────────────────────────────────────────────────────

function ResultScreen({ result, onClose }: { result: ConfirmResult; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 py-2 sm:py-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
      </div>
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Term advanced successfully</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">All active cohorts have moved to their next term</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
        {[
          { label: 'Cohorts advanced', value: result.cohorts_advanced, color: 'text-[#1e3a5f]' },
          { label: 'Units completed',  value: result.units_completed,  color: 'text-emerald-600' },
          { label: 'Units skipped',    value: result.skipped_units,    color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-xl bg-slate-50 py-2.5 sm:py-3 px-1 sm:px-2">
            <p className={cn('text-xl sm:text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {(result.detail ?? []).length > 0 && (
        <details className="w-full text-xs text-slate-500">
          <summary className="cursor-pointer select-none font-medium text-xs sm:text-sm">View detail log</summary>
          <ul className="mt-2 space-y-1 pl-2 max-h-32 overflow-y-auto">
            {result.detail.map((line, i) => (
              <li key={i} className="before:content-['·'] before:mr-1 text-[10px] sm:text-xs">{line}</li>
            ))}
          </ul>
        </details>
      )}
      <button
        onClick={onClose}
        className="w-full py-2 sm:py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs sm:text-sm font-semibold hover:bg-[#16304f] transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdvanceTermModal() {
  const now = new Date()
  const currentSemester = now.getMonth() < 4 ? 1 : now.getMonth() < 8 ? 2 : 3

  const qc = useQueryClient()
  const { activeTerm } = useTermStore()

  const [open, setOpen]           = useState(false)
  const [mode, setMode]           = useState<ModalMode>('browse')
  const [year, setYear]           = useState(now.getFullYear())
  const [semester, setSemester]   = useState(currentSemester)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [result, setResult]       = useState<ConfirmResult | null>(null)

  const termId   = activeTerm?.id ?? ''
  const termName = activeTerm?.name

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery<PreviewData>({
    queryKey: ['term-advance-preview', termId, mode, mode === 'browse' ? year : null, mode === 'browse' ? semester : null],
    queryFn: () => mode === 'browse' ? fetchPreview(termId, year, semester) : fetchPreview(termId),
    enabled: open && !!termId && !result,
    staleTime: 0,
  })

  const cohorts = preview?.advancing_cohorts ?? []

  useEffect(() => {
    if (preview && mode === 'advance') setOverrides(seedOverrides(preview.advancing_cohorts ?? []))
  }, [preview, mode])

  const { mutate: confirm, isPending: confirming } = useMutation({
    mutationFn: () => confirmAdvance(termId, overrides),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['cohorts'] })
      qc.invalidateQueries({ queryKey: ['master-timetable'] })
      qc.invalidateQueries({ queryKey: ['cohort-progress'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Advance failed — please try again'),
  })

  const handleOpen       = () => { setOpen(true); setResult(null); setOverrides({}); setMode('browse') }
  const handleClose      = () => { setOpen(false); setResult(null); setOverrides({}) }
  const handleModeChange = (m: ModalMode) => { setMode(m); setOverrides({}); setResult(null) }

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
      for (const u of cohort.units_to_complete ?? []) {
        if (val) { delete next[u.unit_id] } else { next[u.unit_id] = false }
      }
      return next
    })
  }, [])

  const skippedCount  = Object.values(overrides).filter((v) => v === false).length
  const mismatchCount = cohorts.filter((c) => c.term_is_synced === false).length
  const totalCohorts  = preview?.total_cohorts_advancing ?? cohorts.length

  return (
    <>
      {/* Trigger button — compact on mobile */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-colors bg-[#1e3a5f] text-white hover:bg-[#16304f] shadow-sm"
      >
        <FastForwardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden xs:inline">Manage Term</span>
        <span className="xs:hidden">Term</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Drag handle — mobile only */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-slate-300" />
            </div>

            {/* ── Header ── */}
            {!result && (
              <div className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 space-y-2.5 sm:space-y-3">

                {/* Top row */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {mode === 'browse' ? 'Cohort curriculum by semester' : 'Advance all cohorts'}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {mode === 'browse'
                        ? 'Browse which units each cohort was studying at any point in time.'
                        : termName
                        ? `End of ${termName} — mark units complete and move all cohorts forward.`
                        : 'Mark units complete and move all cohorts to their next term.'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                  >
                    <XIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                  {(['browse', 'advance'] as ModalMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={cn(
                        'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all capitalize',
                        mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {m === 'browse' ? 'Browse' : 'Advance'}
                    </button>
                  ))}
                </div>

                {/* Period switcher — browse only */}
                {mode === 'browse' && (
                  <PeriodSwitcher
                    year={year}
                    semester={semester}
                    onYearChange={setYear}
                    onSemesterChange={setSemester}
                  />
                )}

                {/* Mismatch warning */}
                {mode === 'advance' && mismatchCount > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-amber-800 flex items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold">{mismatchCount} cohort{mismatchCount > 1 ? 's' : ''}</span>
                    <span>ha{mismatchCount === 1 ? 's' : 've'} a term mismatch. Switch to Browse to investigate.</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4">
              {result && <ResultScreen result={result} onClose={handleClose} />}

              {!result && previewLoading && (
                <div className="flex flex-col items-center gap-3 py-10 sm:py-12 text-slate-400">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-slate-200 border-t-[#1e3a5f] animate-spin" />
                  <p className="text-xs sm:text-sm">Loading cohort data…</p>
                </div>
              )}

              {!result && previewError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700">
                  Failed to load. Check your connection and try again.
                </div>
              )}

              {!result && !termId && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-400">
                  No active term selected. Use the term switcher in the top bar.
                </div>
              )}

              {!result && preview && mode === 'browse' && (
                <div className="mb-3 sm:mb-4 rounded-xl bg-blue-50 border border-blue-200 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-blue-800">
                  Showing curriculum for <strong>{year}</strong> Semester <strong>{semester}</strong>.
                  Each cohort's term is computed from their intake date.
                  {mismatchCount > 0 && (
                    <span className="ml-1">
                      <strong>{mismatchCount}</strong> cohort{mismatchCount > 1 ? 's have' : ' has'} a mismatch.
                    </span>
                  )}
                </div>
              )}

              {!result && preview && mode === 'advance' && (
                <div className="mb-3 sm:mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs text-amber-800">
                  <p className="font-semibold">Review before confirming</p>
                  <p className="mt-0.5 opacity-80">
                    Checked units will be marked <strong>Completed</strong>.
                    Uncheck any unit to keep it as In Progress.
                  </p>
                </div>
              )}

              {!result && preview && cohorts.length === 0 && (
                <p className="text-center text-slate-500 py-6 sm:py-8 text-xs sm:text-sm">
                  {mode === 'browse'
                    ? 'No cohorts were active in this period.'
                    : 'No active cohorts are eligible to advance right now.'}
                </p>
              )}

              {!result && preview && cohorts.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  {cohorts.map((cohort) => (
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
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-t border-slate-200 shrink-0 bg-slate-50 gap-2 sm:gap-3">
                <div className="text-[10px] sm:text-xs text-slate-500 min-w-0 truncate">
                  {mode === 'browse'
                    ? <span>{totalCohorts} cohort{totalCohorts !== 1 ? 's' : ''} · {year} Sem {semester}</span>
                    : skippedCount > 0
                    ? <span className="text-amber-600 font-medium">{skippedCount} unit{skippedCount > 1 ? 's' : ''} will be skipped</span>
                    : <span>{totalCohorts} cohort{totalCohorts !== 1 ? 's' : ''} will advance</span>
                  }
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={handleClose}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {mode === 'browse' ? 'Close' : 'Cancel'}
                  </button>
                  {mode === 'advance' && (
                    <button
                      onClick={() => confirm()}
                      disabled={confirming || cohorts.length === 0}
                      className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-colors bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirming
                        ? <span className="flex items-center gap-1.5 sm:gap-2">
                            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            <span className="hidden xs:inline">Advancing…</span>
                          </span>
                        : <span>
                            <span className="hidden xs:inline">Advance & confirm</span>
                            <span className="xs:hidden">Advance</span>
                          </span>
                      }
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