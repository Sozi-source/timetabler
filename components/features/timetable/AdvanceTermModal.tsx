'use client'

/**
 * AdvanceTermModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-phase bulk term advancement modal.
 *
 * Usage (add to your timetable page header or term switcher):
 *
 *   import AdvanceTermModal from '@/components/features/timetable/AdvanceTermModal'
 *
 *   <AdvanceTermModal termId={currentTermId} termName={currentTermName} />
 *
 * What it does:
 *   1. Opens on button click
 *   2. Calls GET /api/term/advance-all/?term=<id>  → preview
 *   3. Shows each cohort with its units as checkboxes
 *      — units where server sends mark_complete: false start UNCHECKED
 *      — units where server sends mark_complete: true  start CHECKED
 *   4. User can toggle any unit
 *   5. On confirm → POST /api/term/advance-all/ { phase: "confirm", overrides }
 *   6. Invalidates cohort + timetable queries on success
 *
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
  mark_complete: boolean   // server-supplied default — we must respect this
}

interface CohortPreview {
  cohort_id: string
  cohort_name: string
  programme: string
  from_term: number
  to_term: number
  can_advance: boolean
  units_to_complete: UnitPreview[]
}

interface PreviewData {
  term_id: string
  term_name: string
  cohorts: CohortPreview[]
  total_cohorts: number
}

interface ConfirmResult {
  cohorts_advanced: number
  units_completed: number
  skipped_units: number
  detail: string[]
}

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchPreview = (termId: string): Promise<PreviewData> =>
  api.get(`/term/advance-all/?term=${termId}`).then((r) => r.data.data)

const confirmAdvance = (
  termId: string,
  overrides: Record<string, boolean>
): Promise<ConfirmResult> =>
  api
    .post('/term/advance-all/', { term_id: termId, phase: 'confirm', overrides })
    .then((r) => r.data.data)

// ── Seed overrides from server mark_complete ──────────────────────────────────
// Only stores entries where mark_complete === false (skip units).
// Units with mark_complete === true need no entry — they're the default.
function seedOverrides(cohorts: CohortPreview[]): Record<string, boolean> {
  const seed: Record<string, boolean> = {}
  for (const cohort of cohorts) {
    for (const unit of cohort.units_to_complete) {
      if (!unit.mark_complete) {
        seed[unit.unit_id] = false   // server says don't auto-complete → start unchecked
      }
    }
  }
  return seed
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UnitRow({
  unit,
  checked,
  onChange,
}: {
  unit: UnitPreview
  checked: boolean
  onChange: (id: string, val: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(unit.unit_id, e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#1e3a5f] cursor-pointer"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-800 font-mono">
          {unit.code}
        </span>
        <span className="block text-xs text-slate-500 truncate">{unit.name}</span>
      </span>
      <span className="text-[10px] font-medium text-slate-400 mt-0.5 shrink-0">
        {unit.credit_hours} CH
      </span>
    </label>
  )
}

function CohortSection({
  cohort,
  overrides,
  onToggleUnit,
  onToggleAll,
}: {
  cohort: CohortPreview
  overrides: Record<string, boolean>
  onToggleUnit: (unitId: string, val: boolean) => void
  onToggleAll: (cohort: CohortPreview, val: boolean) => void
}) {
  const allChecked = cohort.units_to_complete.every(
    (u) => overrides[u.unit_id] !== false
  )

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Cohort header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{cohort.cohort_name}</p>
          <p className="text-xs text-slate-500">{cohort.programme}</p>
        </div>

        {/* Term badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
            Term {cohort.from_term}
          </span>
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
            Term {cohort.to_term}
          </span>
        </div>

        {/* Select all toggle */}
        {cohort.units_to_complete.length > 0 && (
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
        <div className="divide-y divide-slate-100 px-2 py-1">
          {cohort.units_to_complete.map((unit) => (
            <UnitRow
              key={unit.unit_id}
              unit={unit}
              checked={overrides[unit.unit_id] !== false}
              onChange={onToggleUnit}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-400 italic">
          No scheduled units found for this term — cohort will still advance.
        </p>
      )}
    </div>
  )
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  onClose,
}: {
  result: ConfirmResult
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900">Term advanced successfully</h3>
        <p className="text-sm text-slate-500 mt-1">All active cohorts have moved to their next term</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { label: 'Cohorts advanced', value: result.cohorts_advanced, color: 'text-[#1e3a5f]' },
          { label: 'Units completed', value: result.units_completed, color: 'text-emerald-600' },
          { label: 'Units skipped',   value: result.skipped_units,   color: 'text-amber-600'  },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-xl bg-slate-50 py-3 px-2">
            <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Detail log (collapsible) */}
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
  const [open, setOpen]       = useState(false)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [result, setResult]   = useState<ConfirmResult | null>(null)
  const queryClient           = useQueryClient()

  // ── Preview query (fires when modal opens) ─────────────────────────────────
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery<PreviewData>({
    queryKey: ['term-advance-preview', termId],
    queryFn: () => fetchPreview(termId),
    enabled: open && !result,
    staleTime: 0,
  })

  // ── Seed overrides from server's mark_complete when preview arrives ─────────
  // This is the critical fix: if the server says mark_complete: false for a
  // unit (e.g. it wasn't fully taught), we start that unit unchecked instead
  // of blindly defaulting everything to checked.
  useEffect(() => {
    if (preview) {
      setOverrides(seedOverrides(preview.cohorts))
    }
  }, [preview])

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
  }

  const handleClose = () => {
    setOpen(false)
    setResult(null)
    setOverrides({})
  }

  const handleToggleUnit = useCallback((unitId: string, val: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (val) {
        delete next[unitId]       // checked → remove the false override
      } else {
        next[unitId] = false      // unchecked → mark as skip
      }
      return next
    })
  }, [])

  const handleToggleAll = useCallback((cohort: CohortPreview, val: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev }
      for (const u of cohort.units_to_complete) {
        if (val) {
          delete next[u.unit_id]        // check all → remove skips
        } else {
          next[u.unit_id] = false       // uncheck all → skip all
        }
      }
      return next
    })
  }, [])

  const skippedCount = Object.values(overrides).filter((v) => v === false).length

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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        Advance Term
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal panel */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            {!result && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Advance All Cohorts</h2>
                  {termName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      End of <span className="font-medium">{termName}</span> — move all cohorts to their next term
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* Result screen */}
              {result && (
                <ResultScreen result={result} onClose={handleClose} />
              )}

              {/* Loading state */}
              {!result && previewLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#1e3a5f] animate-spin" />
                  <p className="text-sm">Loading cohort preview…</p>
                </div>
              )}

              {/* Error state */}
              {!result && previewError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  Failed to load preview. Check your connection and try again.
                </div>
              )}

              {/* Preview content */}
              {!result && preview && (
                <div className="space-y-4">
                  {/* Info banner */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <p className="font-semibold">Review before confirming</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      Checked units will be marked <strong>Completed</strong> in each cohort's progress record.
                      Uncheck any unit you want to keep as In Progress or handle manually.
                    </p>
                  </div>

                  {/* No cohorts */}
                  {preview.cohorts.length === 0 && (
                    <p className="text-center text-slate-500 py-8 text-sm">
                      No active cohorts are eligible to advance right now.
                    </p>
                  )}

                  {/* Cohort sections */}
                  {preview.cohorts.map((cohort) => (
                    <CohortSection
                      key={cohort.cohort_id}
                      cohort={cohort}
                      overrides={overrides}
                      onToggleUnit={handleToggleUnit}
                      onToggleAll={handleToggleAll}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!result && preview && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50">
                <div className="text-xs text-slate-500">
                  {skippedCount > 0 ? (
                    <span className="text-amber-600 font-medium">
                      {skippedCount} unit{skippedCount > 1 ? 's' : ''} will be skipped
                    </span>
                  ) : (
                    <span>{preview.total_cohorts} cohort{preview.total_cohorts !== 1 ? 's' : ''} will advance</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirm()}
                    disabled={confirming || preview.cohorts.length === 0}
                    className={cn(
                      'px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                      'bg-[#1e3a5f] text-white hover:bg-[#16304f]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      confirming && 'opacity-70'
                    )}
                  >
                    {confirming ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Advancing…
                      </span>
                    ) : (
                      'Advance & Confirm'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}