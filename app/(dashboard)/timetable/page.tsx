'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
  ShieldCheck, X, ChevronRight, Zap, ExternalLink,
  ChevronUp, AlertCircle, Info, ArrowRight, RotateCcw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  type:               string
  cohort?:            string
  unit_code?:         string
  unit_name?:         string
  trainer_name?:      string
  trainer_id?:        string
  sole_units?:        [string, string][]
  units_count?:       number
  sessions_needed?:   number
  max_periods?:       number
  students?:          number
  max_room_capacity?: number
  needed?:            number
  available?:         number
  message:            string
}

interface ValidationResult {
  blocking:     ValidationIssue[]
  warnings:     ValidationIssue[]
  can_generate: boolean
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

// ─── Issue config ─────────────────────────────────────────────────────────────

function getIssueConfig(issue: ValidationIssue): { label: string; fixLabel?: string; fixPath?: string } {
  switch (issue.type) {
    case 'NO_TRAINER':                return { label: 'No trainer assigned',       fixLabel: 'Assign trainer \u2192', fixPath: '/setup/units-on-offer' }
    case 'TRAINER_OVERLOAD':          return { label: 'Trainer overloaded',        fixLabel: 'View trainers \u2192',  fixPath: '/setup/trainers' }
    case 'SINGLE_TRAINER_BOTTLENECK': return { label: 'Single-trainer bottleneck', fixLabel: 'View trainers \u2192',  fixPath: '/setup/trainers' }
    case 'NO_SUITABLE_ROOM':          return { label: 'No suitable room',          fixLabel: 'View rooms \u2192',     fixPath: '/setup/rooms' }
    case 'SLOT_SHORTAGE':             return { label: 'Slot shortage',             fixLabel: 'View constraints \u2192', fixPath: '/constraints' }
    default:                          return { label: issue.type }
  }
}

// ─── IssueRow ─────────────────────────────────────────────────────────────────

function IssueRow({ issue, variant, onNavigate }: {
  issue:      ValidationIssue
  variant:    'blocking' | 'warning'
  onNavigate: (path: string) => void
}) {
  const cfg        = getIssueConfig(issue)
  const isBlocking = variant === 'blocking'

  return (
    <div className={cn(
      'group rounded-xl border px-3 py-2.5 transition-all',
      isBlocking
        ? 'border-red-200 bg-red-50 hover:border-red-300'
        : 'border-amber-200 bg-amber-50 hover:border-amber-300',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {isBlocking
            ? <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {issue.cohort && (
                <span className={cn('text-xs font-bold', isBlocking ? 'text-red-800' : 'text-amber-800')}>
                  {issue.cohort}
                </span>
              )}
              {issue.cohort && (issue.unit_code || issue.trainer_name) && (
                <span className={cn('text-xs', isBlocking ? 'text-red-300' : 'text-amber-300')}>&middot;</span>
              )}
              {issue.trainer_name && (
                <span className={cn('text-xs font-bold', isBlocking ? 'text-red-800' : 'text-amber-800')}>
                  {issue.trainer_name}
                </span>
              )}
              {issue.unit_code && (
                <span className={cn(
                  'font-mono text-[10px] rounded-md px-1.5 py-0.5 font-bold',
                  isBlocking ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                )}>
                  {issue.unit_code}
                </span>
              )}
            </div>
            <p className={cn('text-xs mt-0.5', isBlocking ? 'text-red-600' : 'text-amber-700')}>
              {issue.message}
            </p>
            {issue.sole_units && issue.sole_units.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {issue.sole_units.slice(0, 4).map(([cohort, code], i) => (
                  <span key={i} className="text-[10px] bg-amber-100 text-amber-600 rounded-md px-1.5 py-0.5 font-mono font-semibold">
                    {code} ({cohort})
                  </span>
                ))}
                {issue.sole_units.length > 4 && (
                  <span className="text-[10px] text-amber-500 font-medium">+{issue.sole_units.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        </div>

        {cfg.fixPath && (
          <button
            onClick={() => onNavigate(cfg.fixPath!)}
            className={cn(
              'shrink-0 flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2 py-1',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isBlocking ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700',
            )}
          >
            {cfg.fixLabel}
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ValidateModal ────────────────────────────────────────────────────────────

function ValidateModal({ result, onProceed, onCancel }: {
  result:    ValidationResult
  onProceed: () => void
  onCancel:  () => void
}) {
  const router = useRouter()
  const [warningsOpen, setWarningsOpen] = useState(true)

  const hasBlocking = result.blocking.length > 0
  const hasWarnings = result.warnings.length > 0
  const allClear    = !hasBlocking && !hasWarnings
  const severity    = hasBlocking ? 'error' : hasWarnings ? 'warning' : 'ok'

  function handleNavigate(path: string) { onCancel(); router.push(path) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={cn(
          'px-5 py-4 flex items-center justify-between shrink-0 border-b',
          severity === 'error'   && 'bg-red-50 border-red-100',
          severity === 'warning' && 'bg-amber-50 border-amber-100',
          severity === 'ok'      && 'bg-emerald-50 border-emerald-100',
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'rounded-xl p-1.5',
              severity === 'error'   && 'bg-red-100',
              severity === 'warning' && 'bg-amber-100',
              severity === 'ok'      && 'bg-emerald-100',
            )}>
              {severity === 'error'   && <AlertCircle   className="h-4 w-4 text-red-600" />}
              {severity === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              {severity === 'ok'      && <CheckCircle2  className="h-4 w-4 text-emerald-600" />}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">
                {severity === 'error'   && 'Issues detected before generation'}
                {severity === 'warning' && 'Warnings detected before generation'}
                {severity === 'ok'      && 'All checks passed'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {result.summary.cohorts_checked} cohorts &middot; {result.summary.units_checked} units checked
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors rounded-xl p-1.5 hover:bg-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary chips */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2 flex-wrap shrink-0">
          {hasBlocking && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 ring-1 ring-red-200">
              <XCircle className="h-3 w-3" />
              {result.summary.blocking_count} blocking
            </span>
          )}
          {hasWarnings && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 ring-1 ring-amber-200">
              <AlertTriangle className="h-3 w-3" />
              {result.summary.warning_count} warning{result.summary.warning_count > 1 ? 's' : ''}
            </span>
          )}
          {allClear && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              No issues
            </span>
          )}
          {hasBlocking && (
            <span className="text-xs text-gray-400 ml-auto">Some units may be skipped</span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-3">
          {hasBlocking && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-red-100" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                  Blocking &middot; {result.blocking.length}
                </span>
                <div className="h-px flex-1 bg-red-100" />
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 flex items-start gap-2 mb-3">
                <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  Blocking issues mean some units <strong>will be skipped</strong> during generation.
                  You can fix them now or generate and fix manually afterward.
                </p>
              </div>
              {result.blocking.map((issue, i) => (
                <IssueRow key={i} issue={issue} variant="blocking" onNavigate={handleNavigate} />
              ))}
            </div>
          )}

          {hasWarnings && (
            <div className="mt-3">
              <button
                onClick={() => setWarningsOpen(o => !o)}
                className="w-full flex items-center gap-2 mb-2 group"
              >
                <div className="h-px flex-1 bg-amber-100" />
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 group-hover:text-amber-600 transition-colors">
                  Warnings &middot; {result.warnings.length}
                  {warningsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
                <div className="h-px flex-1 bg-amber-100" />
              </button>
              {warningsOpen && (
                <div className="space-y-1.5">
                  {result.warnings.map((issue, i) => (
                    <IssueRow key={i} issue={issue} variant="warning" onNavigate={handleNavigate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {allClear && (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-gray-700">Everything looks good</p>
              <p className="text-xs text-gray-400">Ready to generate the timetable.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          'px-5 py-4 border-t shrink-0',
          hasBlocking ? 'border-red-100 bg-red-50/50' : 'border-gray-100 bg-gray-50/50',
        )}>
          {hasBlocking ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Fix issues first
              </button>
              <button
                onClick={onProceed}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                Generate anyway
              </button>
            </div>
          ) : hasWarnings ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Review first
              </button>
              <button
                onClick={onProceed}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-all"
              >
                Generate with warnings
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onProceed}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Generate timetable
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── RevertConfirmModal ───────────────────────────────────────────────────────

function RevertConfirmModal({ onConfirm, onCancel }: {
  onConfirm: () => void
  onCancel:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-amber-100 bg-amber-50">
          <div className="rounded-xl p-1.5 bg-amber-100">
            <RotateCcw className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Revert to Draft?</h2>
            <p className="text-xs text-gray-500 mt-0.5">This will unpublish the timetable</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Reverting to draft will make the timetable <strong>invisible to students and trainers</strong> until re-published.
          </p>
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Existing entries are preserved. You can fix conflicts, regenerate, and re-publish without losing your setup.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            Keep Published
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Revert to Draft
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const { activeTerm } = useTermStore()
  const qc             = useQueryClient()
  const termId         = activeTerm?.id ?? ''

  const { data, isLoading, isError, refetch } = useMasterTimetable(termId)

  const [selectedCohort,       setSelectedCohort]       = useState<string | null>(null)
  const [showCohortPicker,     setShowCohortPicker]     = useState(false)
  const [publishing,           setPublishing]           = useState(false)
  const [reverting,            setReverting]            = useState(false)
  const [showRevertModal,      setShowRevertModal]       = useState(false)
  const [clearing,             setClearing]             = useState(false)
  const [validationResult,     setValidationResult]     = useState<ValidationResult | null>(null)
  const [proceedAfterValidate, setProceedAfterValidate] = useState(false)

  const [gen, setGen] = useState<GenProgress>({
    stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '',
  })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!showCohortPicker) return
    const handler = () => setShowCohortPicker(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [showCohortPicker])

  useEffect(() => {
    if (proceedAfterValidate) {
      setProceedAfterValidate(false)
      runGenerate()
    }
  }, [proceedAfterValidate]) // eslint-disable-line react-hooks/exhaustive-deps

  const grid: TimetableGridType = data?.grid         ?? {}
  const periods                 = data?.periods       ?? []
  const days                    = data?.days          ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const status: TimetableStatus = data?.status        ?? 'DRAFT'
  const totalEntries: number    = data?.total_entries ?? 0
  const isDataReady             = !isLoading && data !== undefined

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

  async function invalidateAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.masterTT(termId) }),
      qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ])
  }

  async function handleGenerate() {
    if (!termId || gen.stage === 'submitting' || gen.stage === 'waiting' || gen.stage === 'validating') return
    setGen({ stage: 'validating', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: 'Checking data\u2026' })
    try {
      const res = await api.get('/timetable/validate/', { params: { term: termId } })
      const vResult: ValidationResult = res.data?.data ?? res.data
      if (vResult.blocking.length === 0 && vResult.warnings.length === 0) {
        setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
        runGenerate()
        return
      }
      setValidationResult(vResult)
      setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
    } catch {
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
        message: attempt === 1 ? 'Sending to scheduler\u2026' : `Retrying (${attempt}/${MAX_ATTEMPTS})\u2026`,
      })
      try {
        const res = await api.post(
          '/timetable/generate/',
          { term_id: termId },
          { timeout: 300_000, signal: controller.signal },
        )
        setGen(g => ({ ...g, stage: 'waiting', message: 'Building timetable\u2026' }))
        await new Promise(r => setTimeout(r, POLL_DELAY_MS))
        if (controller.signal.aborted) return
        await invalidateAll()
        const d = res.data?.data ?? res.data ?? {}
        const result = {
          placed:           d.placed          ?? d.scheduled    ?? 0,
          total_required:   d.total_required  ?? 0,
          completion_rate:  d.completion_rate ?? 0,
          unresolved_count: d.unresolved_count ?? 0,
          conflicts:        d.conflicts       ?? 0,
        }
        setGen({ stage: 'done', attempt, maxAttempts: MAX_ATTEMPTS, message: 'Generation complete', result })
        const conflictTxt = result.conflicts > 0 ? ` \u00b7 ${result.conflicts} conflict${result.conflicts !== 1 ? 's' : ''}` : ''
        const pct = result.completion_rate ? ` (${result.completion_rate}%)` : ''
        toast.success(`Generated ${result.placed} entries${pct}${conflictTxt}`)
        return
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        const isTimeout = (err as { code?: string })?.code === 'ECONNABORTED'
        const apiMsg    = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        if (attempt < MAX_ATTEMPTS) { await new Promise(r => setTimeout(r, RETRY_DELAY_MS)); continue }
        setGen({ stage: 'failed', attempt, maxAttempts: MAX_ATTEMPTS, message: apiMsg ?? (isTimeout ? 'Timed out after 5 minutes' : 'Generation failed') })
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
  const isBusy       = isGenerating || isValidating || publishing || reverting || clearing

  async function handlePublish(force = false) {
    if (!termId) return
    setPublishing(true)
    try {
      await api.post('/timetable/publish/', { term_id: termId, ...(force ? { force: true } : {}) })
      await invalidateAll()
      toast.success('Timetable published successfully.')
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { error?: string } } })?.response
      if (res?.status === 400)      { await invalidateAll(); toast.success('Timetable is already published.') }
      else if (res?.status === 409) { const ok = window.confirm('High severity conflicts. Force-publish anyway?'); if (ok) await handlePublish(true) }
      else toast.error(res?.data?.error ?? 'Publish failed.')
    } finally { setPublishing(false) }
  }

  async function handleRevertToDraft() {
    if (!termId) return
    setReverting(true)
    setShowRevertModal(false)
    try {
      await api.post('/timetable/revert/', { term_id: termId })
      await invalidateAll()
      setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
      toast.success('Timetable reverted to draft. You can now regenerate.')
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response
      toast.error(res?.data?.error ?? 'Could not revert to draft.')
    } finally { setReverting(false) }
  }

  async function handleClearDraft() {
    if (!termId) return
    const confirmed = window.confirm('Delete ALL draft entries for this term? This cannot be undone.')
    if (!confirmed) return
    setClearing(true)
    try {
      await api.delete('/timetable/drafts/', { data: { term_id: termId } })
      await invalidateAll()
      setSelectedCohort(null)
      setGen({ stage: 'idle', attempt: 0, maxAttempts: MAX_ATTEMPTS, message: '' })
      toast.success('Draft cleared.')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not clear draft.')
    } finally { setClearing(false) }
  }

  const statusBadge: Record<TimetableStatus, string> = {
    DRAFT:     'bg-amber-50 text-amber-700 border-amber-200 ring-amber-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200 ring-red-200',
  }

  // Progress bar component
  const GenProgressBar = () => {
    if (gen.stage === 'idle') return null
    const isActive = isGenerating || isValidating
    const isFailed = gen.stage === 'failed'
    const isDone   = gen.stage === 'done'

    return (
      <div className={cn(
        'rounded-2xl border px-4 py-3.5 text-sm transition-all',
        isDone       && 'border-emerald-200 bg-emerald-50',
        isFailed     && 'border-red-200 bg-red-50',
        isGenerating && 'border-blue-200 bg-blue-50',
        isValidating && 'border-indigo-200 bg-indigo-50',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isActive && <Loader2      className="h-4 w-4 shrink-0 animate-spin text-blue-500" />}
            {isDone   && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {isFailed && <XCircle      className="h-4 w-4 shrink-0 text-red-500" />}
            <span className={cn(
              'font-semibold truncate text-sm',
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
                <span className="font-bold tabular-nums">{gen.result.placed} placed</span>
                {gen.result.completion_rate > 0 && <span className="text-emerald-600 font-mono">{gen.result.completion_rate}%</span>}
                {gen.result.conflicts > 0 && <span className="text-amber-600 font-semibold">{gen.result.conflicts} conflict{gen.result.conflicts !== 1 ? 's' : ''}</span>}
                {gen.result.unresolved_count > 0 && <span className="text-red-600 font-semibold">{gen.result.unresolved_count} unplaced</span>}
              </div>
            )}
            {isActive && (
              <button onClick={handleCancelGenerate} className="text-xs text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2">
                Cancel
              </button>
            )}
            {(isDone || isFailed) && (
              <button onClick={() => setGen(g => ({ ...g, stage: 'idle' }))} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
          {isValidating && <div className="h-full w-1/4 rounded-full bg-indigo-400 animate-pulse" />}
          {isGenerating && (
            <div className={cn('h-full rounded-full bg-blue-400 transition-all duration-700',
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

  if (!termId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-700">No active term selected</p>
          <p className="text-sm text-gray-400 mt-1">Select a term from the top bar to view the timetable.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Validation modal */}
      {validationResult && (
        <ValidateModal
          result={validationResult}
          onProceed={() => { setValidationResult(null); setProceedAfterValidate(true) }}
          onCancel={() => setValidationResult(null)}
        />
      )}

      {/* Revert to draft confirmation modal */}
      {showRevertModal && (
        <RevertConfirmModal
          onConfirm={handleRevertToDraft}
          onCancel={() => setShowRevertModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Master Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTerm?.name ?? ''}
            {totalEntries > 0 && (
              <span className="ml-2 text-gray-400 tabular-nums">&middot; {totalEntries} scheduled units</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ring-1',
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
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              >
                <Users className="h-4 w-4 text-gray-400" />
                {selectedCohort ? cohorts.find(c => c.id === selectedCohort)?.name ?? 'Cohort' : 'All Cohorts'}
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>
              {showCohortPicker && (
                <div className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-2xl border border-gray-200 bg-white shadow-xl py-1.5 text-sm">
                  <button
                    onClick={() => { setSelectedCohort(null); setShowCohortPicker(false) }}
                    className={cn('w-full text-left px-3.5 py-2 hover:bg-gray-50 transition-colors rounded-lg mx-1', !selectedCohort && 'font-bold text-[#1e3a5f]')}
                  >
                    All Cohorts <span className="text-xs text-gray-400 font-normal">({cohorts.length})</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  {cohorts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCohort(c.id); setShowCohortPicker(false) }}
                      className={cn('w-full text-left px-3.5 py-2 hover:bg-gray-50 transition-colors', selectedCohort === c.id && 'font-bold text-[#1e3a5f]')}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DRAFT actions: Generate + Clear Draft */}
          {isDataReady && status === 'DRAFT' && (
            <>
              <button
                onClick={isGenerating || isValidating ? handleCancelGenerate : handleGenerate}
                disabled={clearing || reverting}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm',
                  isGenerating || isValidating ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#1e3a5f] hover:bg-[#162d4a]',
                )}
              >
                {isValidating ? <><ShieldCheck className="h-4 w-4 animate-pulse" />Validating&hellip;</>
                  : isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Cancel</>
                  : <><BookOpen className="h-4 w-4" />Generate</>}
              </button>

              {totalEntries > 0 && (
                <button
                  onClick={handleClearDraft}
                  disabled={isBusy}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                >
                  {clearing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Clearing&hellip;</>
                    : <><Trash2 className="h-4 w-4" />Clear Draft</>}
                </button>
              )}
            </>
          )}

          {/* PUBLISHED actions: Revert to Draft */}
          {isDataReady && status === 'PUBLISHED' && (
            <button
              onClick={() => setShowRevertModal(true)}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-all shadow-sm"
              title="Revert to draft to make changes and regenerate"
            >
              {reverting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Reverting&hellip;</>
                : <><RotateCcw className="h-4 w-4" />Revert to Draft</>}
            </button>
          )}

          {/* Publish — visible for DRAFT and PUBLISHED */}
          {isDataReady && (status === 'DRAFT' || status === 'PUBLISHED') && (
            <button
              onClick={() => handlePublish()}
              disabled={publishing || (status === 'DRAFT' && totalEntries === 0) || isGenerating || isValidating || reverting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {publishing
                ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing&hellip;</>
                : <><Send className="h-4 w-4" />Publish</>}
            </button>
          )}

          <button
            onClick={() => refetch()}
            disabled={isLoading || isBusy}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Revert in-progress banner */}
      {reverting && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Reverting to draft&hellip;</p>
            <p className="text-xs text-amber-600 mt-0.5">The timetable will be unpublished momentarily.</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <GenProgressBar />

      {/* Cohort pills */}
      {cohorts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">
            {cohorts.length} cohort{cohorts.length > 1 ? 's' : ''}:
          </span>
          {cohorts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCohort(prev => prev === c.id ? null : c.id)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all active:scale-[.97]',
                selectedCohort === c.id
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
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
          <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-red-700">Failed to load timetable</p>
          <button onClick={() => refetch()} className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700 font-semibold">
            Try again
          </button>
        </div>
      ) : isLoading || gen.stage === 'waiting' ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-200" />
        </div>
      ) : totalEntries === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-500">No timetable entries yet</p>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Make sure trainers are assigned to units, then click{' '}
            <span className="font-bold text-[#1e3a5f]">Generate</span>.
          </p>
          {gen.stage === 'failed' && (
            <button
              onClick={handleGenerate}
              className="mt-2 rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-all shadow-sm"
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