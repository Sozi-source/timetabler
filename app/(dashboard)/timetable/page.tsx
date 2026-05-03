'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { useMasterTimetable } from '@/hooks/useTimetable'
import {
  queryKeys,
  type TimetableStatus,
  type TimetableGrid as TimetableGridType,
  type ScheduledUnit,
} from '@/types'
import api from '@/lib/api'
import TimetableGrid from '@/components/features/timetable/TimetableGrid'
import TimetableAI from '@/components/features/timetable/TimetableAI'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  RefreshCw, Trash2, Send, Loader2, Users, BookOpen,
  AlertTriangle, CheckCircle2, ChevronDown, XCircle,
  ShieldCheck, X, ChevronRight,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type GenStage = 'idle' | 'validating' | 'submitting' | 'waiting' | 'done' | 'failed'

interface GenProgress {
  stage:       GenStage
  attempt:     number
  maxAttempts: number
  message:     string
  result?: {
    placed:           number
    total_required:   number
    completion_rate:  number
    unresolved_count: number
    conflicts:        number
  }
}

interface ValidationIssue {
  type:        string
  cohort?:     string
  unit_code?:  string
  unit_name?:  string
  trainer_name?: string
  trainer_id?:   string
  sole_units?:   [string, string][]
  units_count?:  number
  sessions_needed?: number
  max_periods?:    number
  students?:       number
  max_room_capacity?: number
  needed?:    number
  available?: number
  message:    string
}

interface ValidationResult {
  blocking:      ValidationIssue[]
  warnings:      ValidationIssue[]
  can_generate:  boolean
  summary: {
    blocking_count:  number
    warning_count:   number
    cohorts_checked: number
    units_checked:   number
  }
}

const MAX_ATTEMPTS   = 3
const POLL_DELAY_MS  = 2_500
const RETRY_DELAY_MS = 1_500

// ─────────────────────────────────────────────────────────────────
// Validate Modal
// ─────────────────────────────────────────────────────────────────

function ValidateModal({
  result,
  onProceed,
  onCancel,
}: {
  result:    ValidationResult
  onProceed: () => void
  onCancel:  () => void
}) {
  const hasBlocking = result.blocking.length > 0
  const hasWarnings = result.warnings.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className={cn(
          'px-6 py-4 flex items-center justify-between',
          hasBlocking ? 'bg-red-50 border-b border-red-100' : 'bg-amber-50 border-b border-amber-100',
        )}>
          <div className="flex items-center gap-2">
            {hasBlocking
              ? <XCircle className="h-5 w-5 text-red-500" />
              : <AlertTriangle className="h-5 w-5 text-amber-500" />
            }
            <h2 className="font-semibold text-gray-900">
              {hasBlocking ? 'Issues Found — Fix Before Generating' : 'Warnings Found'}
            </h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary chips */}
        <div className="px-6 pt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">
            Checked {result.summary.cohorts_checked} cohorts · {result.summary.units_checked} units
          </span>
          {result.summary.blocking_count > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5">
              {result.summary.blocking_count} blocking
            </span>
          )}
          {result.summary.warning_count > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
              {result.summary.warning_count} warning{result.summary.warning_count > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Issues list */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
          {result.blocking.map((issue, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    {issue.cohort && <span className="font-bold">{issue.cohort} · </span>}
                    {issue.unit_code && <span className="font-mono">{issue.unit_code}</span>}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">{issue.message}</p>
                </div>
              </div>
            </div>
          ))}

          {result.warnings.map((issue, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-800">
                    {issue.trainer_name
                      ? <span className="font-bold">{issue.trainer_name}</span>
                      : issue.cohort && <span className="font-bold">{issue.cohort}</span>
                    }
                    {issue.unit_code && <span className="font-mono ml-1">{issue.unit_code}</span>}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{issue.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            Fix Issues First
          </button>

          {!hasBlocking && (
            <button
              onClick={onProceed}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-all"
            >
              Generate Anyway
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {hasBlocking && (
            <p className="text-xs text-red-600 font-medium">
              Resolve blocking issues before generating
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const { activeTerm } = useTermStore()
  const qc             = useQueryClient()
  const termId         = activeTerm?.id ?? ''

  const { data, isLoading, isError, refetch } = useMasterTimetable(termId)

  const [selectedCohort,       setSelectedCohort]       = useState<string | null>(null)
  const [showCohortPicker,     setShowCohortPicker]     = useState(false)
  const [publishing,           setPublishing]           = useState(false)
  const [clearing,             setClearing]             = useState(false)
  const [validationResult,     setValidationResult]     = useState<ValidationResult | null>(null)
  const [proceedAfterValidate, setProceedAfterValidate] = useState(false)

  const [gen, setGen] = useState<GenProgress>({
    stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '',
  })
  const abortRef = useRef<AbortController | null>(null)

  // Close cohort picker on outside click
  useEffect(() => {
    if (!showCohortPicker) return
    const handler = () => setShowCohortPicker(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [showCohortPicker])

  // When user chooses to proceed from validation modal
  useEffect(() => {
    if (proceedAfterValidate) {
      setProceedAfterValidate(false)
      runGenerate()
    }
  }, [proceedAfterValidate]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ──────────────────────────────────────────────────────────
  const grid: TimetableGridType = data?.grid         ?? {}
  const periods                 = data?.periods       ?? []
  const days                    = data?.days          ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const status: TimetableStatus = data?.status        ?? 'DRAFT'
  const totalEntries: number    = data?.total_entries ?? 0

  const allEntries = useMemo<ScheduledUnit[]>(() => {
    const out: ScheduledUnit[] = []
    for (const daySlots of Object.values(grid))
      for (const slotEntries of Object.values(daySlots))
        out.push(...slotEntries)
    return out
  }, [grid])

  const cohorts = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of allEntries) {
      const id = (e as { cohort_id?: string }).cohort_id ?? e.cohort ?? ''
      if (id && !map.has(id)) map.set(id, (e as { cohort_name?: string }).cohort_name ?? e.cohort ?? id)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allEntries])

  const filteredGrid = useMemo<TimetableGridType>(() => {
    if (!selectedCohort) return grid
    const out: TimetableGridType = {}
    for (const [day, slots] of Object.entries(grid)) {
      const fs: Record<string, ScheduledUnit[]> = {}
      for (const [pid, entries] of Object.entries(slots)) {
        const fe = entries.filter(e => {
          const eid = (e as { cohort_id?: string }).cohort_id ?? e.cohort
          return eid === selectedCohort
        })
        if (fe.length) fs[pid] = fe
      }
      if (Object.keys(fs).length) out[day] = fs
    }
    return out
  }, [grid, selectedCohort])

  // ── Cache invalidation ────────────────────────────────────────────────────
  async function invalidateAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.masterTT(termId) }),
      qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ])
  }

  // ── Validate then generate ────────────────────────────────────────────────
  async function handleGenerate() {
    if (!termId || gen.stage === 'submitting' || gen.stage === 'waiting' || gen.stage === 'validating') return

    // Step 1: validate
    setGen({ stage: 'validating', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: 'Checking data…' })
    try {
      const res = await api.get('/timetable/validate/', { params: { term: termId } })
      const vResult: ValidationResult = res.data?.data ?? res.data

      // If all clear, go straight to generate
      if (vResult.blocking.length === 0 && vResult.warnings.length === 0) {
        setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
        runGenerate()
        return
      }

      // Show modal
      setValidationResult(vResult)
      setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
    } catch {
      // If validate endpoint fails, proceed to generate anyway
      runGenerate()
    }
  }

  const runGenerate = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      setGen({
        stage: 'submitting', attempt, maxAttempts: MAX_ATTEMPTS,
        message: attempt === 1 ? 'Sending to scheduler…' : `Retrying (${attempt}/${MAX_ATTEMPTS})…`,
      })

      try {
        const res = await api.post(
          '/timetable/generate/',
          { term_id: termId },
          { timeout: 300_000, signal: controller.signal },
        )

        setGen(g => ({ ...g, stage: 'waiting', message: 'Building timetable…' }))
        await new Promise(r => setTimeout(r, POLL_DELAY_MS))
        if (controller.signal.aborted) return

        await invalidateAll()

        const d = res.data?.data ?? res.data ?? {}
        const result = {
          placed:           d.placed           ?? d.scheduled      ?? 0,
          total_required:   d.total_required   ?? 0,
          completion_rate:  d.completion_rate  ?? 0,
          unresolved_count: d.unresolved_count ?? 0,
          conflicts:        d.conflicts        ?? 0,
        }

        setGen({ stage: 'done', attempt, maxAttempts: MAX_ATTEMPTS, message: 'Generation complete', result })

        const conflictTxt = result.conflicts > 0
          ? ` · ${result.conflicts} conflict${result.conflicts !== 1 ? 's' : ''}`
          : ''
        const pct = result.completion_rate ? ` (${result.completion_rate}%)` : ''
        toast.success(`Generated ${result.placed} entries${pct}${conflictTxt}`)
        return

      } catch (err: unknown) {
        if (controller.signal.aborted) return

        const isTimeout = (err as { code?: string })?.code === 'ECONNABORTED'
        const apiMsg    = (err as { response?: { data?: { error?: string } } })?.response?.data?.error

        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
          continue
        }

        setGen({
          stage: 'failed', attempt, maxAttempts: MAX_ATTEMPTS,
          message: apiMsg ?? (isTimeout ? 'Timed out after 5 minutes' : 'Generation failed'),
        })
        toast.error(apiMsg ?? 'Generation failed after all retries.')
      }
    }
  }, [termId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCancelGenerate() {
    abortRef.current?.abort()
    setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
  }

  const isGenerating = gen.stage === 'submitting' || gen.stage === 'waiting'
  const isValidating = gen.stage === 'validating'

  // ── Publish ───────────────────────────────────────────────────────────────
  async function handlePublish(force = false) {
    if (!termId) return
    setPublishing(true)
    try {
      await api.post('/timetable/publish/', { term_id: termId, ...(force ? { force: true } : {}) })
      await invalidateAll()
      toast.success('Timetable published.')
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response
      if (res?.status === 400) {
        await invalidateAll()
        toast.success('Timetable is already published.')
      } else if (res?.status === 409) {
        const ok = window.confirm('There are unresolved HIGH severity conflicts. Force-publish anyway?')
        if (ok) await handlePublish(true)
      } else {
        toast.error(res?.data?.error ?? 'Publish failed.')
      }
    } finally {
      setPublishing(false)
    }
  }

  // ── Clear draft ───────────────────────────────────────────────────────────
  async function handleClearDraft() {
    if (!termId) return
    const confirmed = window.confirm(
      'This will delete ALL draft timetable entries for this term. This cannot be undone. Continue?'
    )
    if (!confirmed) return

    setClearing(true)
    try {
      await api.delete('/timetable/drafts/', { data: { term_id: termId } })
      await invalidateAll()
      setSelectedCohort(null)
      setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
      toast.success('Draft cleared.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not clear draft.'
      toast.error(msg)
    } finally {
      setClearing(false)
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusBadge: Record<TimetableStatus, string> = {
    DRAFT:     'bg-amber-100 text-amber-800 border-amber-200',
    PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const GenProgressBar = () => {
    if (gen.stage === 'idle') return null
    const isActive = isGenerating || isValidating
    const isFailed = gen.stage === 'failed'
    const isDone   = gen.stage === 'done'

    return (
      <div className={cn(
        'rounded-xl border px-4 py-3 text-sm transition-all',
        isDone       && 'border-emerald-200 bg-emerald-50',
        isFailed     && 'border-red-200 bg-red-50',
        isGenerating && 'border-blue-200 bg-blue-50',
        isValidating && 'border-indigo-200 bg-indigo-50',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {(isActive) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />}
            {isDone     && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {isFailed   && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
            <span className={cn(
              'font-medium truncate',
              isDone       && 'text-emerald-700',
              isFailed     && 'text-red-700',
              isGenerating && 'text-blue-700',
              isValidating && 'text-indigo-700',
            )}>
              {gen.message}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isDone && gen.result && (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <span className="font-semibold">{gen.result.placed} placed</span>
                {gen.result.completion_rate > 0 && (
                  <span className="text-emerald-600">{gen.result.completion_rate}%</span>
                )}
                {gen.result.conflicts > 0 && (
                  <span className="text-amber-600">
                    {gen.result.conflicts} conflict{gen.result.conflicts !== 1 ? 's' : ''}
                  </span>
                )}
                {gen.result.unresolved_count > 0 && (
                  <span className="text-red-600">{gen.result.unresolved_count} unplaced</span>
                )}
              </div>
            )}
            {isActive && (
              <button
                onClick={handleCancelGenerate}
                className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
              >
                Cancel
              </button>
            )}
            {(isDone || isFailed) && (
              <button
                onClick={() => setGen(g => ({ ...g, stage: 'idle' }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/60">
          {isValidating && <div className="h-full w-1/4 rounded-full bg-indigo-400 animate-pulse" />}
          {isGenerating && (
            <div className={cn(
              'h-full rounded-full bg-blue-400 transition-all duration-700',
              gen.stage === 'submitting' && 'w-1/3',
              gen.stage === 'waiting'    && 'w-3/4',
            )} />
          )}
          {isDone   && <div className="h-full w-full rounded-full bg-emerald-400" />}
          {isFailed && <div className="h-full w-1/3 rounded-full bg-red-400" />}
        </div>
      </div>
    )
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!termId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-lg font-semibold text-gray-700">No active term selected</p>
        <p className="text-sm text-gray-400">Select a term from the top bar to view the timetable.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Validate modal */}
      {validationResult && (
        <ValidateModal
          result={validationResult}
          onProceed={() => {
            setValidationResult(null)
            setProceedAfterValidate(true)
          }}
          onCancel={() => setValidationResult(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? ''}
            {totalEntries > 0 && (
              <span className="ml-2 text-gray-400">· {totalEntries} scheduled units</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
            statusBadge[status],
          )}>
            {status === 'PUBLISHED' && <CheckCircle2  className="h-3 w-3" />}
            {status === 'DRAFT'     && <RefreshCw     className="h-3 w-3" />}
            {status === 'CANCELLED' && <AlertTriangle className="h-3 w-3" />}
            {status}
          </span>

          {/* Cohort filter */}
          {cohorts.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowCohortPicker(o => !o)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Users className="h-4 w-4 text-gray-400" />
                {selectedCohort
                  ? cohorts.find(c => c.id === selectedCohort)?.name ?? 'Cohort'
                  : 'All Cohorts'}
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>
              {showCohortPicker && (
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-1 text-sm">
                  <button
                    onClick={() => { setSelectedCohort(null); setShowCohortPicker(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors',
                      !selectedCohort && 'font-semibold text-[#1e3a5f]',
                    )}
                  >
                    All Cohorts
                    <span className="ml-1 text-xs text-gray-400">({cohorts.length})</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  {cohorts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCohort(c.id); setShowCohortPicker(false) }}
                      className={cn(
                        'w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors',
                        selectedCohort === c.id && 'font-semibold text-[#1e3a5f]',
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {status === 'DRAFT' && (
            <>
              {/* Generate (with validate pre-flight) */}
              <button
                onClick={isGenerating || isValidating ? handleCancelGenerate : handleGenerate}
                disabled={clearing}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all disabled:opacity-50',
                  isGenerating || isValidating ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#1e3a5f] hover:bg-[#162d4a]',
                )}
              >
                {isValidating
                  ? <><ShieldCheck className="h-4 w-4 animate-pulse" />Validating…</>
                  : isGenerating
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Cancel</>
                    : <><BookOpen className="h-4 w-4" />Generate</>
                }
              </button>

              {totalEntries > 0 && (
                <button
                  onClick={handleClearDraft}
                  disabled={clearing || isGenerating || isValidating}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                >
                  {clearing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Clearing…</>
                    : <><Trash2 className="h-4 w-4" />Clear Draft</>
                  }
                </button>
              )}

              <button
                onClick={() => handlePublish()}
                disabled={publishing || totalEntries === 0 || isGenerating || isValidating}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {publishing
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
                  : <><Send className="h-4 w-4" />Publish</>
                }
              </button>
            </>
          )}

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <GenProgressBar />

      {/* Cohort pills */}
      {cohorts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {cohorts.length} cohort{cohorts.length > 1 ? 's' : ''}:
          </span>
          {cohorts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCohort(prev => prev === c.id ? null : c.id)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all',
                selectedCohort === c.id
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm font-semibold text-red-700">Failed to load timetable</p>
          <button onClick={() => refetch()} className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700">
            Try again
          </button>
        </div>
      ) : isLoading || gen.stage === 'waiting' ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : totalEntries === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 gap-3">
          <BookOpen className="h-10 w-10 text-gray-300" />
          <p className="text-base font-semibold text-gray-500">No timetable entries yet</p>
          <p className="text-sm text-gray-400">
            Make sure trainers are assigned to units, then click{' '}
            <span className="font-semibold text-[#1e3a5f]">Generate</span>.
          </p>
          {gen.stage === 'failed' && (
            <button
              onClick={handleGenerate}
              className="mt-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-all"
            >
              Retry Generation
            </button>
          )}
        </div>
      ) : (
        <TimetableGrid grid={filteredGrid} periods={periods} days={days} termId={termId} status={status} />
      )}

      <TimetableAI />
    </div>
  )
}