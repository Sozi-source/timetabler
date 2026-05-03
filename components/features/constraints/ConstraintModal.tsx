'use client'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import type { Constraint } from '@/types'
import { createConstraint, updateConstraint } from '@/services/setup'
import { toast } from 'sonner'
import {
  X, Loader2, Pin, Ban, Home, Users, BookOpen,
  ChevronRight, ChevronLeft, Check,
  Pencil,
} from 'lucide-react'
import api from '@/lib/api'

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 'MON', label: 'Mon' },
  { value: 'TUE', label: 'Tue' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Thu' },
  { value: 'FRI', label: 'Fri' },
]

const RULES = [
  {
    value: 'PIN_DAY_PERIOD',
    label: 'Fix to Day & Session',
    icon: Pin,
    description: 'Always scheduled on this exact day and session',
    activeColor: 'bg-[#1e3a5f] border-[#1e3a5f] text-white',
  },
  {
    value: 'AVOID_DAY',
    label: 'Avoid Day',
    icon: Ban,
    description: 'Never placed on the selected day(s)',
    activeColor: 'bg-red-600 border-red-600 text-white',
  },
  {
    value: 'PREFERRED_ROOM',
    label: 'Preferred Room',
    icon: Home,
    description: 'Scheduler prefers this room when placing',
    activeColor: 'bg-teal-600 border-teal-600 text-white',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  constraint: Constraint | null
  open: boolean
  onClose: () => void
}

type RuleType = 'PIN_DAY_PERIOD' | 'AVOID_DAY' | 'PREFERRED_ROOM'

interface RuleConfig {
  rule: RuleType
  // PIN_DAY_PERIOD — now multi-day + multi-period
  days?: string[]       // replaces single `day`
  periodIds?: string[]  // replaces single `periodId`
  // legacy single-value fields (kept for edit-mode back-compat)
  day?: string
  avoidDays?: string[]
  periodId?: string
  roomId?: string
  notes?: string
  isActive: boolean
}

// null = use default, false = skip this unit, RuleConfig = custom
type UnitOverride = null | false | RuleConfig

interface UnitEntry {
  id: string
  code: string
  name: string
  is_combined: boolean
  override: UnitOverride
}

type RawCohort    = { id: string; name: string; programme: string; programme_id?: string; current_term?: number }
type RawProgramme = { id: string; name?: string; code: string; sharing_group?: string }
type RawCurrUnit  = { id: string; code: string; name: string }
type AnyPeriod    = { id: string; label: string; start_time?: string; is_break?: boolean }
type AnyRoom      = { id: string; name: string }

function unwrap<T>(raw: unknown): T[] {
  if (!raw) return []
  const d = (raw as { data?: unknown }).data
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object' && 'results' in (d as object))
    return (d as { results: T[] }).results
  if (Array.isArray(raw)) return raw as T[]
  return []
}

const DEFAULT_RULE_CONFIG: RuleConfig = {
  rule: 'PIN_DAY_PERIOD',
  days: [],
  periodIds: [],
  avoidDays: [],
  roomId: '',
  notes: '',
  isActive: true,
}

// ── RuleEditor ────────────────────────────────────────────────────────────────

function RuleEditor({
  config,
  onChange,
  periods,
  rooms,
  compact = false,
}: {
  config: RuleConfig
  onChange: (c: RuleConfig) => void
  periods: AnyPeriod[]
  rooms: AnyRoom[]
  compact?: boolean
}) {
  function toggleAvoidDay(d: string) {
    const cur = config.avoidDays ?? []
    onChange({ ...config, avoidDays: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d] })
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Rule selector */}
      <div className="flex flex-col gap-1.5">
        {RULES.map(r => {
          const Icon   = r.icon
          const active = config.rule === r.value
          return (
            <button
              key={r.value}
              onClick={() => onChange({ ...config, rule: r.value as RuleType })}
              className={[
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all',
                active ? r.activeColor : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="font-semibold">{r.label}</p>
                {!compact && (
                  <p className={['text-[10px]', active ? 'opacity-75' : 'text-gray-400'].join(' ')}>
                    {r.description}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* PIN_DAY_PERIOD */}
      {config.rule === 'PIN_DAY_PERIOD' && (
        <>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Days <span className="text-gray-400 font-normal">(select all that apply)</span>
            </p>
            <div className="flex gap-1.5">
              {DAYS.map(d => {
                const active = (config.days ?? []).includes(d.value)
                return (
                  <button
                    key={d.value}
                    onClick={() => {
                      const cur = config.days ?? []
                      onChange({
                        ...config,
                        days: active ? cur.filter(x => x !== d.value) : [...cur, d.value],
                      })
                    }}
                    className={[
                      'flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all',
                      active
                        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Sessions <span className="text-gray-400 font-normal">(select all that apply)</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {periods.map(p => {
                const active = (config.periodIds ?? []).includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      const cur = config.periodIds ?? []
                      onChange({
                        ...config,
                        periodIds: active ? cur.filter(x => x !== p.id) : [...cur, p.id],
                      })
                    }}
                    className={[
                      'flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                      active
                        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span>{p.label}</span>
                    {p.start_time && (
                      <span className={['text-[10px] font-normal', active ? 'opacity-70' : 'text-gray-400'].join(' ')}>
                        {p.start_time.slice(0, 5)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Summary pill */}
            {(config.days ?? []).length > 0 && (config.periodIds ?? []).length > 0 && (
              <p className="mt-2 text-[10px] text-gray-500">
                Will create{' '}
                <span className="font-semibold text-[#1e3a5f]">
                  {(config.days ?? []).length} day{(config.days ?? []).length !== 1 ? 's' : ''} ×{' '}
                  {(config.periodIds ?? []).length} session{(config.periodIds ?? []).length !== 1 ? 's' : ''} ={' '}
                  {(config.days ?? []).length * (config.periodIds ?? []).length} constraint{(config.days ?? []).length * (config.periodIds ?? []).length !== 1 ? 's' : ''}
                </span>{' '}
                for this unit.
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Preferred Room <span className="text-gray-300 font-normal">(optional)</span>
            </p>
            <select
              value={config.roomId ?? ''}
              onChange={e => onChange({ ...config, roomId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="">Any available room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* AVOID_DAY */}
      {config.rule === 'AVOID_DAY' && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Days to Avoid</p>
          <div className="flex gap-1.5">
            {DAYS.map(d => (
              <button
                key={d.value}
                onClick={() => toggleAvoidDay(d.value)}
                className={[
                  'flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all',
                  (config.avoidDays ?? []).includes(d.value)
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PREFERRED_ROOM */}
      {config.rule === 'PREFERRED_ROOM' && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Room</p>
          <select
            value={config.roomId ?? ''}
            onChange={e => onChange({ ...config, roomId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <option value="">Select room…</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Label <span className="text-gray-300 font-normal">(optional)</span>
        </p>
        <input
          value={config.notes ?? ''}
          onChange={e => onChange({ ...config, notes: e.target.value })}
          placeholder="e.g. Fixed clinical slot"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        />
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function ConstraintModal({ constraint, open, onClose }: Props) {
  const qc     = useQueryClient()
  const isEdit = !!constraint

  const [step,         setStep]         = useState(0)
  const [cohortId,     setCohortId]     = useState('')
  const [defaultRule,  setDefaultRule]  = useState<RuleConfig>({ ...DEFAULT_RULE_CONFIG })
  const [applyDefault, setApplyDefault] = useState(true)
  const [units,        setUnits]        = useState<UnitEntry[]>([])
  const [activeUnit,   setActiveUnit]   = useState<string | null>(null)

  // ── Reference data ─────────────────────────────────────────────────────

  const { data: cohortsRaw } = useQuery({
    queryKey: queryKeys.cohorts,
    queryFn:  () => api.get('/cohorts/').then(r => r.data),
    enabled:  open,
  })
  const cohorts        = unwrap<RawCohort>(cohortsRaw)
  const selectedCohort = cohorts.find(c => c.id === cohortId)

  const { data: progsRaw } = useQuery({
    queryKey: queryKeys.programmes,
    queryFn:  () => api.get('/programmes/').then(r => r.data),
    enabled:  open,
  })
  const programmes = unwrap<RawProgramme>(progsRaw)

  // FIX: robust programme lookup — tries programme_id UUID first, then falls
  // back to matching by code or name against the cohort's programme string
  const selectedProgramme = programmes.find(p =>
    (selectedCohort?.programme_id && p.id === selectedCohort.programme_id) ||
    p.id === selectedCohort?.programme ||
    p.code === selectedCohort?.programme ||
    p.name === selectedCohort?.programme
  )

  const termNum = selectedCohort?.current_term ?? 1

  const {
    data: cohortUnitsRaw,
    isLoading: loadingUnits,
    isFetching: fetchingUnits,
  } = useQuery({
    queryKey: ['curriculum', 'cohort-units', selectedProgramme?.id ?? '', termNum],
    queryFn:  () =>
      api.get(`/curriculum/?programme=${selectedProgramme!.id}&term_number=${termNum}`)
        .then(r => r.data),
    // FIX: enabled only when we have a resolved programme ID
    enabled: open && !!cohortId && !!selectedProgramme?.id,
    staleTime: 0,
  })
  const rawCohortUnits = unwrap<RawCurrUnit>(cohortUnitsRaw)

  const sharingGroup      = selectedProgramme?.sharing_group ?? ''
  const partnerProgrammes = sharingGroup
    ? programmes.filter(p => p.sharing_group === sharingGroup && p.id !== selectedProgramme?.id)
    : []

  const { data: partnerUnitsRaw } = useQuery({
    queryKey: ['curriculum', 'partner-units', sharingGroup, termNum],
    queryFn: () =>
      Promise.all(
        partnerProgrammes.map(p =>
          api.get(`/curriculum/?programme=${p.id}&term_number=${termNum}`)
            .then(r => unwrap<RawCurrUnit>(r.data))
        )
      ),
    enabled: open && !!cohortId && partnerProgrammes.length > 0,
  })
  const partnerNames = new Set<string>(
    (partnerUnitsRaw ?? []).flat().map((u: RawCurrUnit) => u.name.trim())
  )

  const { data: periodsRaw } = useQuery({
    queryKey: queryKeys.periods,
    queryFn:  () => api.get('/periods/').then(r => r.data),
    enabled:  open,
  })
  const periods = unwrap<AnyPeriod>(periodsRaw).filter(p => !p.is_break)

  const { data: roomsRaw } = useQuery({
    queryKey: queryKeys.rooms,
    queryFn:  () => api.get('/rooms/').then(r => r.data),
    enabled:  open,
  })
  const rooms = unwrap<AnyRoom>(roomsRaw)

  // ── Sync units when cohort units load ──────────────────────────────────

  useEffect(() => {
    if (!rawCohortUnits.length) return
    setUnits(rawCohortUnits.map(u => ({
      id:          u.id,
      code:        u.code,
      name:        u.name,
      is_combined: partnerNames.has(u.name.trim()),
      override:    null,
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortUnitsRaw, partnerUnitsRaw])

  // ── Reset when cohort changes ──────────────────────────────────────────

  useEffect(() => {
    setUnits([])
    setActiveUnit(null)
  }, [cohortId])

  // ── Reset on open/close ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    if (constraint) {
      setCohortId(constraint.cohort ?? '')
      setDefaultRule({
        rule:      (constraint.rule as RuleType) ?? 'PIN_DAY_PERIOD',
        // Populate both array and legacy scalar fields for edit back-compat
        days:      (constraint.parameters?.day as string)
                     ? [(constraint.parameters.day as string)]
                     : [],
        periodIds: (constraint.parameters?.period_id as string)
                     ? [(constraint.parameters.period_id as string)]
                     : [],
        day:       (constraint.parameters?.day as string) ?? '',
        avoidDays: (constraint.parameters?.avoid_days as string[]) ?? [],
        periodId:  (constraint.parameters?.period_id as string) ?? '',
        roomId:    (constraint.parameters?.preferred_room as string) ?? '',
        notes:     constraint.notes ?? '',
        isActive:  constraint.is_active,
      })
      setApplyDefault(true)
      setStep(0)
    } else {
      setCohortId('')
      setDefaultRule({ ...DEFAULT_RULE_CONFIG })
      setApplyDefault(true)
      setUnits([])
      setActiveUnit(null)
      setStep(0)
    }
  }, [open, constraint])

  // ── Helpers ────────────────────────────────────────────────────────────

  function updateUnitOverride(unitId: string, override: UnitOverride) {
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, override } : u))
  }

  function effectiveConfig(u: UnitEntry): RuleConfig | false {
    if (u.override === false) return false
    if (u.override !== null)  return u.override
    if (applyDefault)         return defaultRule
    return false
  }

  const configuredUnits = units.filter(u => effectiveConfig(u) !== false)

  // ── Validation ─────────────────────────────────────────────────────────

  function isRuleValid(cfg: RuleConfig): boolean {
    if (cfg.rule === 'PIN_DAY_PERIOD')
      return !!(cfg.days?.length && cfg.periodIds?.length)
    if (cfg.rule === 'AVOID_DAY')      return !!(cfg.avoidDays?.length)
    if (cfg.rule === 'PREFERRED_ROOM') return !!cfg.roomId
    return false
  }

  // FIX: step 0 only requires a cohort — default rule is optional
  const step0Valid = !!cohortId
  // FIX: step 1 can proceed as long as units loaded (even if none configured)
  const step1Valid = !loadingUnits && !fetchingUnits

  // ── Payload builder ────────────────────────────────────────────────────

  function buildParams(cfg: RuleConfig, day: string, periodId: string): object {
    if (cfg.rule === 'PIN_DAY_PERIOD')
      return { day, period_id: periodId, ...(cfg.roomId ? { preferred_room: cfg.roomId } : {}) }
    if (cfg.rule === 'AVOID_DAY')
      return { avoid_days: cfg.avoidDays }
    if (cfg.rule === 'PREFERRED_ROOM')
      return { preferred_room: cfg.roomId }
    return {}
  }

  function buildPayloads(): object[] {
    if (isEdit && constraint) {
      // Edit: single constraint — preserve original day/period for back-compat
      const cfg = defaultRule
      const day      = cfg.days?.[0] ?? cfg.day ?? ''
      const periodId = cfg.periodIds?.[0] ?? cfg.periodId ?? ''
      return [{
        notes:           cfg.notes ?? '',
        scope:           'UNIT',
        rule:            cfg.rule,
        is_hard:         cfg.rule !== 'PREFERRED_ROOM',
        is_active:       cfg.isActive,
        cohort:          cohortId || null,
        curriculum_unit: constraint.curriculum_unit,
        parameters:      buildParams(cfg, day, periodId),
      }]
    }

    // Create: fan out each configured unit × each day × each period
    const payloads: object[] = []
    for (const u of configuredUnits) {
      const cfg      = effectiveConfig(u) as RuleConfig
      const isCustom = u.override !== null && u.override !== false

      if (cfg.rule === 'PIN_DAY_PERIOD') {
        for (const day of cfg.days ?? []) {
          for (const periodId of cfg.periodIds ?? []) {
            payloads.push({
              notes:           cfg.notes ?? '',
              scope:           isCustom ? 'UNIT' : 'COHORT',
              rule:            cfg.rule,
              is_hard:         true,
              is_active:       cfg.isActive,
              cohort:          cohortId || null,
              curriculum_unit: isCustom ? u.id : null,
              parameters:      buildParams(cfg, day, periodId),
            })
          }
        }
      } else {
        payloads.push({
          notes:           cfg.notes ?? '',
          scope:           isCustom ? 'UNIT' : 'COHORT',
          rule:            cfg.rule,
          is_hard:         cfg.rule !== 'PREFERRED_ROOM',
          is_active:       cfg.isActive,
          cohort:          cohortId || null,
          curriculum_unit: isCustom ? u.id : null,
          parameters:      buildParams(cfg, '', ''),
        })
      }
    }
    return payloads
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function ruleSummary(cfg: RuleConfig): string {
    if (cfg.rule === 'PIN_DAY_PERIOD') {
      const dayStr = (cfg.days ?? [cfg.day]).filter(Boolean).join(', ') || '?'
      const sessionStr = (cfg.periodIds ?? (cfg.periodId ? [cfg.periodId] : []))
        .map(id => periods.find(x => x.id === id)?.label ?? id)
        .join(', ') || '?'
      return `${dayStr} · ${sessionStr}`
    }
    if (cfg.rule === 'AVOID_DAY')      return `Avoid ${cfg.avoidDays?.join(', ') ?? '?'}`
    if (cfg.rule === 'PREFERRED_ROOM') {
      const r = rooms.find(x => x.id === cfg.roomId)
      return `Room: ${r?.name ?? cfg.roomId ?? '?'}`
    }
    return '—'
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  // Total constraints that will actually be saved (PIN fans out per day×period)
  const totalPayloadCount = (() => {
    if (isEdit) return 1
    let count = 0
    for (const u of configuredUnits) {
      const cfg = effectiveConfig(u) as RuleConfig
      if (cfg.rule === 'PIN_DAY_PERIOD') {
        count += (cfg.days?.length ?? 0) * (cfg.periodIds?.length ?? 0)
      } else {
        count += 1
      }
    }
    return count
  })()

  const mutation = useMutation({
    mutationFn: async () => {
      const payloads = buildPayloads()
      if (isEdit && constraint) return updateConstraint(constraint.id, payloads[0])
      return Promise.all(payloads.map(p => createConstraint(p)))
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Constraint updated'
          : `${totalPayloadCount} constraint${totalPayloadCount !== 1 ? 's' : ''} saved`
      )
      qc.invalidateQueries({ queryKey: queryKeys.constraints })
      onClose()
    },
    onError: () => toast.error('Save failed — check all required fields'),
  })

  if (!open) return null

  const STEP_LABELS = ['Setup', 'Units', 'Review']

  // ── Programme debug info (dev only) ────────────────────────────────────
  const programmeResolved = !!selectedProgramme

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Constraint' : 'Add Constraints'}
            </h2>
            {!isEdit && (
              <div className="flex items-center gap-2 mt-1.5">
                {STEP_LABELS.map((label, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={[
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                      i < step  ? 'bg-emerald-500 text-white' :
                      i === step ? 'bg-[#1e3a5f] text-white' :
                                  'bg-gray-200 text-gray-500',
                    ].join(' ')}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={[
                      'text-xs',
                      i === step ? 'font-semibold text-gray-800' : 'text-gray-400',
                    ].join(' ')}>
                      {label}
                    </span>
                    {i < STEP_LABELS.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 0: Cohort + Default Rule ── */}
          {(step === 0 || isEdit) && (
            <div className="space-y-4">

              {/* Cohort picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Cohort <span className="text-red-400">*</span>
                  </span>
                </label>
                <select
                  value={cohortId}
                  onChange={e => setCohortId(e.target.value)}
                  disabled={isEdit}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:opacity-60"
                >
                  <option value="">{cohorts.length === 0 ? 'Loading…' : 'Select cohort…'}</option>
                  {cohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {/* FIX: show warning if cohort selected but programme can't be resolved */}
                {cohortId && !programmeResolved && programmes.length > 0 && (
                  <p className="mt-1 text-[10px] text-amber-600 font-medium">
                    ⚠ Could not resolve programme for this cohort — units may not load.
                    Check that cohort.programme_id matches a programme in the system.
                  </p>
                )}
              </div>

              {/* Default rule toggle */}
              {!isEdit && cohortId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Default Rule <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <button
                      onClick={() => setApplyDefault(v => !v)}
                      className={[
                        'text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                        applyDefault
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      {applyDefault ? 'ON — applies to all units' : 'OFF — per unit only'}
                    </button>
                  </div>
                  {applyDefault ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <RuleEditor
                        config={defaultRule}
                        onChange={setDefaultRule}
                        periods={periods}
                        rooms={rooms}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-xs text-gray-400 text-center">
                      No default — configure each unit individually in the next step
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode rule editor */}
              {isEdit && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <RuleEditor
                    config={defaultRule}
                    onChange={setDefaultRule}
                    periods={periods}
                    rooms={rooms}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Per-unit overrides ── */}
          {!isEdit && step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {applyDefault && isRuleValid(defaultRule)
                  ? `Default rule (${ruleSummary(defaultRule)}) applied to all units. Click a unit to override or skip it.`
                  : applyDefault
                  ? 'Default rule is incomplete — finish it in Setup, or configure each unit individually.'
                  : 'No default set. Click each unit to configure a constraint.'}
              </p>

              {/* Programme not resolved warning */}
              {!programmeResolved && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  ⚠ Programme could not be resolved for this cohort. No units to display.
                </div>
              )}

              {(loadingUnits || fetchingUnits) ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading units…
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-xs text-gray-400">
                  {programmeResolved
                    ? 'No units on offer for this cohort in the current term.'
                    : 'Select a valid cohort to load units.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {units.map(unit => {
                    const cfg       = effectiveConfig(unit)
                    const skipped   = cfg === false
                    const isOpen    = activeUnit === unit.id
                    const hasCustom = unit.override !== null && unit.override !== false
                    const isValid   = cfg !== false && isRuleValid(cfg)

                    return (
                      <div
                        key={unit.id}
                        className={[
                          'rounded-xl border transition-all',
                          skipped    ? 'border-gray-100 bg-gray-50 opacity-60' :
                          hasCustom  ? 'border-amber-200 bg-amber-50' :
                          applyDefault && isRuleValid(defaultRule) ? 'border-emerald-200 bg-emerald-50/30' :
                          'border-dashed border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        {/* Unit header row */}
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                          onClick={() => setActiveUnit(isOpen ? null : unit.id)}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-800">{unit.code}</span>
                            <span className="text-xs text-gray-500 ml-1.5">{unit.name}</span>
                          </div>
                          {unit.is_combined && (
                            <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                              Combined
                            </span>
                          )}
                          {/* Status badge */}
                          {skipped ? (
                            <span className="shrink-0 text-[10px] text-gray-400 font-medium">Skip</span>
                          ) : hasCustom ? (
                            <span className={[
                              'shrink-0 text-[10px] font-semibold',
                              isValid ? 'text-amber-600' : 'text-red-500',
                            ].join(' ')}>
                              {isValid ? 'Custom' : 'Incomplete'}
                            </span>
                          ) : applyDefault && isRuleValid(defaultRule) ? (
                            <span className="shrink-0 text-[10px] text-emerald-600 font-medium">Default</span>
                          ) : applyDefault ? (
                            <span className="shrink-0 text-[10px] text-amber-500 font-medium">Default incomplete</span>
                          ) : (
                            <span className="shrink-0 text-[10px] text-gray-400">Not set</span>
                          )}
                          <ChevronRight className={[
                            'h-3.5 w-3.5 text-gray-400 transition-transform shrink-0',
                            isOpen ? 'rotate-90' : '',
                          ].join(' ')} />
                        </div>

                        {/* Expanded editor */}
                        {isOpen && (
                          <div className="border-t border-gray-100 px-3 py-3 space-y-3">
                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateUnitOverride(unit.id, null)}
                                className={[
                                  'flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-all',
                                  unit.override === null
                                    ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                                ].join(' ')}
                              >
                                {applyDefault ? 'Use default' : 'No constraint'}
                              </button>
                              <button
                                onClick={() =>
                                  updateUnitOverride(
                                    unit.id,
                                    unit.override !== null && unit.override !== false
                                      ? unit.override
                                      : { ...defaultRule }
                                  )
                                }
                                className={[
                                  'flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-all',
                                  unit.override !== null && unit.override !== false
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                                ].join(' ')}
                              >
                                Custom rule
                              </button>
                              <button
                                onClick={() => updateUnitOverride(unit.id, false)}
                                className={[
                                  'flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-all',
                                  unit.override === false
                                    ? 'bg-gray-500 border-gray-500 text-white'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                                ].join(' ')}
                              >
                                Skip unit
                              </button>
                            </div>

                            {/* Custom rule editor */}
                            {unit.override !== null && unit.override !== false && (
                              <RuleEditor
                                config={unit.override}
                                onChange={cfg => updateUnitOverride(unit.id, cfg)}
                                periods={periods}
                                rooms={rooms}
                                compact
                              />
                            )}

                            {/* Default preview */}
                            {unit.override === null && applyDefault && (
                              <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs text-gray-500">
                                {isRuleValid(defaultRule)
                                  ? <>Will use default: <span className="font-semibold text-gray-700">{ruleSummary(defaultRule)}</span></>
                                  : <span className="text-amber-600">Default rule is incomplete — finish it in Step 1 (Setup).</span>
                                }
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {!isEdit && step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {configuredUnits.length === 0
                  ? 'No constraints configured.'
                  : <>
                      <span className="font-semibold text-gray-700">{configuredUnits.length}</span> constraint{configuredUnits.length !== 1 ? 's' : ''} will be saved for{' '}
                      <span className="font-semibold text-gray-700">{cohorts.find(c => c.id === cohortId)?.name}</span>.
                    </>
                }
              </p>

              {configuredUnits.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-xs text-gray-400">
                  No constraints configured. Go back to set up a default or configure individual units.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {configuredUnits.map(u => {
                    const cfg      = effectiveConfig(u) as RuleConfig
                    const isCustom = u.override !== null && u.override !== false
                    const valid    = isRuleValid(cfg)
                    return (
                      <div key={u.id} className={[
                        'flex items-center gap-3 px-4 py-3',
                        valid ? 'bg-white' : 'bg-red-50',
                      ].join(' ')}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-800">{u.code}</span>
                            {u.is_combined && (
                              <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Combined
                              </span>
                            )}
                            {isCustom && (
                              <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Custom
                              </span>
                            )}
                            {!valid && (
                              <span className="rounded-full bg-red-100 text-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                Incomplete
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{u.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-semibold text-gray-700">
                            {cfg.rule.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[10px] text-gray-400">{ruleSummary(cfg)}</p>
                        </div>
                        <button
                          onClick={() => { setStep(1); setActiveUnit(u.id) }}
                          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 ml-1"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Skipped units */}
              {(() => {
                const skippedCount = units.filter(u => effectiveConfig(u) === false).length
                return skippedCount > 0 ? (
                  <p className="text-[10px] text-gray-400">
                    {skippedCount} unit{skippedCount !== 1 ? 's' : ''} skipped (no constraint)
                  </p>
                ) : null
              })()}

              {/* Incomplete warning */}
              {configuredUnits.some(u => !isRuleValid(effectiveConfig(u) as RuleConfig)) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  Some constraints are incomplete. Fix them before saving.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
          <div>
            {!isEdit && step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            {/* Edit mode */}
            {isEdit && (
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !isRuleValid(defaultRule)}
                className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Update
              </button>
            )}

            {/* Create — Next */}
            {!isEdit && step < 2 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 ? !step0Valid : !step1Valid}
                className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Create — Save */}
            {!isEdit && step === 2 && (
              <button
                onClick={() => mutation.mutate()}
                disabled={
                  mutation.isPending ||
                  configuredUnits.length === 0 ||
                  totalPayloadCount === 0 ||
                  configuredUnits.some(u => !isRuleValid(effectiveConfig(u) as RuleConfig))
                }
                className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Save {totalPayloadCount} Constraint{totalPayloadCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}