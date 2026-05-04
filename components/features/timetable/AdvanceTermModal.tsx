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
      'flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-xl group transition-colors',
      browseMode ? 'cursor-default' : 'hover:bg-slate-50 cursor-pointer'
    )}>
      {browseMode
        ? (
          <span className="shrink-0 flex h-4 w-4 items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </span>
        )
        : (
          <div className={cn(
            'shrink-0 h-4 w-4 rounded-md border-2 flex items-center justify-center transition-all',
            checked ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-slate-300 group-hover:border-slate-400',
          )}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(unit.unit_id, e.target.checked)}
              className="sr-only"
            />
            {checked && <CheckIcon className="h-2.5 w-2.5 text-white" />}
          </div>
        )
      }
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] sm:text-xs font-bold text-slate-800 font-mono tracking-tight">{unit.code}</span>
        <span className="block text-[10px] sm:text-xs text-slate-400 leading-snug truncate">{unit.name}</span>
      </span>
      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 shrink-0 bg-slate-100 rounded-md px-1.5 py-0.5 font-mono">
        {unit.credit_hours} CH
      </span>
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
      'rounded-2xl border overflow-hidden transition-all',
      isMismatch && !isBrowse
        ? 'border-amber-200 shadow-sm shadow-amber-100'
        : 'border-slate-200 shadow-sm',
    )}>
      {/* Card header */}
      <div className={cn(
        'px-3 sm:px-4 py-2.5 sm:py-3 border-b',
        isMismatch && !isBrowse
          ? 'bg-amber-50 border-amber-200'
          : 'bg-slate-50/80 border-slate-100',
      )}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{cohort.cohort_name}</p>
              {isMismatch && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-200 text-amber-800 ring-1 ring-amber-300 shrink-0">
                  sync needed
                </span>
              )}
              {cohort.is_graduating && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-100 text-purple-700 ring-1 ring-purple-200 shrink-0">
                  graduating
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{cohort.programme}</p>
          </div>

          {/* Term arrow */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              T{cohort.from_term}
            </span>
            {!isBrowse && (
              <>
                <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300" />
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                  T{cohort.to_term}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Check all */}
        {!isBrowse && units.length > 0 && (
          <button
            onClick={() => onToggleAll(cohort, !allChecked)}
            className="mt-2 text-[10px] sm:text-xs text-[#1e3a5f] font-semibold hover:underline underline-offset-2 transition-colors"
          >
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        )}
      </div>

      {/* Units list */}
      {units.length > 0
        ? (
          <div className={cn(
            'px-1 sm:px-2 py-1',
            !isBrowse && 'divide-y divide-slate-100',
          )}>
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
        )
        : (
          <p className="px-4 py-3 text-[10px] sm:text-xs text-slate-400 italic">
            {isBrowse ? 'No curriculum units defined for this term.' : 'No scheduled units — cohort will still advance.'}
          </p>
        )
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
      <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <button
          onClick={() => onYearChange(Math.max(MIN_YEAR, year - 1))}
          disabled={year <= MIN_YEAR}
          className="px-2 sm:px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
        <span className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 border-x border-slate-200 min-w-[48px] sm:min-w-[56px] text-center tabular-nums font-mono">
          {year}
        </span>
        <button
          onClick={() => onYearChange(Math.min(MAX_YEAR, year + 1))}
          disabled={year >= MAX_YEAR}
          className="px-2 sm:px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
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
              'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all border active:scale-[.96]',
              semester === s
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] ring-1 ring-[#1e3a5f]/20 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
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
      {/* Success icon */}
      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-100 ring-1 ring-emerald-200 shadow-sm">
        <CheckIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
      </div>

      <div className="text-center">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">Term advanced successfully</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">All active cohorts have moved to their next term</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
        {[
          { label: 'Cohorts advanced', value: result.cohorts_advanced, color: 'text-[#1e3a5f]',   bg: 'bg-[#1e3a5f]/5'  },
          { label: 'Units completed',  value: result.units_completed,  color: 'text-emerald-600', bg: 'bg-emerald-50'  },
          { label: 'Units skipped',    value: result.skipped_units,    color: 'text-amber-600',   bg: 'bg-amber-50'    },
        ].map((s) => (
          <div key={s.label} className={cn('text-center rounded-2xl py-3 sm:py-4 px-2 border border-transparent', s.bg)}>
            <p className={cn('text-2xl sm:text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-1 leading-tight uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Detail log */}
      {(result.detail ?? []).length > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer select-none font-semibold text-xs sm:text-sm text-slate-600 hover:text-slate-800 transition-colors">
            View detail log
          </summary>
          <ul className="mt-2 space-y-1 pl-2 max-h-32 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
            {result.detail.map((line, i) => (
              <li key={i} className="text-[10px] sm:text-xs text-slate-500 flex items-start gap-1.5">
                <span className="text-slate-300 shrink-0 mt-px">·</span>
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        onClick={onClose}
        className="w-full py-2.5 sm:py-3 rounded-2xl bg-[#1e3a5f] text-white text-xs sm:text-sm font-bold hover:bg-[#16304f] transition-colors active:scale-[.98] shadow-sm ring-1 ring-[#1e3a5f]/10"
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
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-[#1e3a5f] text-white hover:bg-[#16304f] shadow-sm ring-1 ring-[#1e3a5f]/10 active:scale-[.97]"
      >
        <FastForwardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden xs:inline">Manage Term</span>
        <span className="xs:hidden">Term</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* ── Header ── */}
            {!result && (
              <div className="shrink-0 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 space-y-3">

                {/* Top row */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {mode === 'browse' ? 'Cohort curriculum by semester' : 'Advance all cohorts'}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {mode === 'browse'
                        ? 'Browse which units each cohort was studying at any point in time.'
                        : termName
                        ? `End of ${termName} — mark units complete and move all cohorts forward.`
                        : 'Mark units complete and move all cohorts to their next term.'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <XIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Mode tabs — pill switcher */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                  {(['browse', 'advance'] as ModalMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={cn(
                        'px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all capitalize',
                        mode === m
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {m === 'browse' ? 'Browse' : 'Advance'}
                    </button>
                  ))}
                </div>

                {/* Period switcher */}
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
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[10px] sm:text-xs text-amber-800 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>
                      <span className="font-bold">{mismatchCount} cohort{mismatchCount > 1 ? 's' : ''}</span>
                      {' '}ha{mismatchCount === 1 ? 's' : 've'} a term mismatch. Switch to Browse to investigate.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4">
              {result && <ResultScreen result={result} onClose={handleClose} />}

              {!result && previewLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-slate-200 border-t-[#1e3a5f] animate-spin" />
                  <p className="text-xs sm:text-sm">Loading cohort data…</p>
                </div>
              )}

              {!result && previewError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-700 flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  Failed to load. Check your connection and try again.
                </div>
              )}

              {!result && !termId && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-8 text-center text-xs sm:text-sm text-slate-400">
                  No active term selected. Use the term switcher in the top bar.
                </div>
              )}

              {/* Browse info banner */}
              {!result && preview && mode === 'browse' && (
                <div className="mb-3 sm:mb-4 rounded-xl bg-blue-50 border border-blue-200 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs text-blue-800">
                  Showing curriculum for <strong>{year}</strong> Semester <strong>{semester}</strong>.
                  Each cohort's term is computed from their intake date.
                  {mismatchCount > 0 && (
                    <span className="ml-1">
                      <strong>{mismatchCount}</strong> cohort{mismatchCount > 1 ? 's have' : ' has'} a mismatch.
                    </span>
                  )}
                </div>
              )}

              {/* Advance info banner */}
              {!result && preview && mode === 'advance' && (
                <div className="mb-3 sm:mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs text-amber-800">
                  <p className="font-bold">Review before confirming</p>
                  <p className="mt-0.5 opacity-80">
                    Checked units will be marked <strong>Completed</strong>.
                    Uncheck any unit to keep it as In Progress.
                  </p>
                </div>
              )}

              {!result && preview && cohorts.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-xs sm:text-sm">
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
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-t border-slate-200 shrink-0 bg-slate-50/80 gap-2 sm:gap-3">
                <div className="text-[10px] sm:text-xs text-slate-500 min-w-0 truncate">
                  {mode === 'browse'
                    ? <span className="tabular-nums">{totalCohorts} cohort{totalCohorts !== 1 ? 's' : ''} · {year} Sem {semester}</span>
                    : skippedCount > 0
                    ? <span className="text-amber-600 font-semibold tabular-nums">{skippedCount} unit{skippedCount > 1 ? 's' : ''} will be skipped</span>
                    : <span className="tabular-nums">{totalCohorts} cohort{totalCohorts !== 1 ? 's' : ''} will advance</span>
                  }
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={handleClose}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 border border-transparent hover:border-slate-200 transition-colors active:scale-[.97]"
                  >
                    {mode === 'browse' ? 'Close' : 'Cancel'}
                  </button>
                  {mode === 'advance' && (
                    <button
                      onClick={() => confirm()}
                      disabled={confirming || cohorts.length === 0}
                      className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ring-1 ring-[#1e3a5f]/10 active:scale-[.97] disabled:active:scale-100"
                    >
                      {confirming
                        ? (
                          <span className="flex items-center gap-1.5 sm:gap-2">
                            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span className="hidden xs:inline">Advancing…</span>
                          </span>
                        )
                        : (
                          <span>
                            <span className="hidden xs:inline">Advance & confirm</span>
                            <span className="xs:hidden">Advance</span>
                          </span>
                        )
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