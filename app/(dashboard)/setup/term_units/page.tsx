'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, AlertCircle, Search, Users, BookOpen,
  Loader2, ChevronDown, RefreshCw, X, Link2, Save,
} from 'lucide-react'
import api from '@/lib/api'
import { useTermStore } from '@/store/index'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trainer { id: string; full_name: string; short_name: string }
interface QualifiedTrainer { id: string; name: string }
interface CurriculumUnit {
  id: string; code: string; name: string; unit_type: string
  periods_per_week: number; is_outsourced: boolean; qualified_trainers: QualifiedTrainer[]
}
interface Cohort {
  id: string; name: string; current_term: number; programme: string
  programme_id: string; start_year: number; start_month: number
}
interface Programme { id: string; code: string; name: string; total_terms: number; sharing_group: string }
interface UnitRow {
  unitId: string; unitCode: string; unitName: string; unitType: string
  periodsPerWeek: number; isOutsourced: boolean; qualifiedTrainers: QualifiedTrainer[]
  currentTrainerId: string | null; saving: boolean; dirty: boolean
}
interface CombinedRow {
  key: string; unitName: string; unitCode: string; unitType: string
  periodsPerWeek: number; isOutsourced: boolean; qualifiedTrainers: QualifiedTrainer[]
  cohorts: { cohortId: string; cohortName: string; unitId: string }[]
  currentTrainerId: string | null; saving: boolean; dirty: boolean
}
interface CohortSection {
  cohortId: string; cohortName: string; programme: string
  currentTerm: number; units: UnitRow[]
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function fetchAll<T>(url: string): Promise<T> {
  const res = await api.get(url)
  const d = res.data as any
  if (d && 'ok' in d) return d.data
  if (Array.isArray(d)) return d as unknown as T
  if (d?.results) return d.results
  return d
}

// ─── Unit type config — teal-anchored, minimal palette ───────────────────────

const TYPE_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Core:      { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
  Elective:  { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  Practical: { bg: 'bg-teal-50/60',text: 'text-teal-600',   dot: 'bg-teal-300' },
  Project:   { bg: 'bg-slate-100', text: 'text-slate-700',  dot: 'bg-slate-500' },
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase',
      cfg.bg, cfg.text,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
      {type}
    </span>
  )
}

// ─── TrainerDropdown ──────────────────────────────────────────────────────────

function TrainerDropdown({
  trainers, allTrainers, value, saving, onChange, onClear, isLocked, lockedReason,
}: {
  trainers: QualifiedTrainer[]; allTrainers: Trainer[]; value: string | null
  saving: boolean; onChange: (id: string) => void; onClear: () => void
  isLocked?: boolean; lockedReason?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const qualifiedIds = new Set(trainers.map(t => t.id))
  const filteredQ = trainers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const filteredO = allTrainers
    .filter(t => !qualifiedIds.has(t.id))
    .filter(t =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.short_name.toLowerCase().includes(search.toLowerCase())
    )

  const selectedName =
    trainers.find(t => t.id === value)?.name ??
    allTrainers.find(t => t.id === value)?.short_name ?? null

  const close = () => { setOpen(false); setSearch('') }

  if (isLocked) return (
    <div title={lockedReason}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-400 cursor-not-allowed">
      <Link2 className="h-3 w-3 shrink-0 text-teal-400" />
      <span className="truncate max-w-[120px]">{selectedName ?? 'Linked'}</span>
    </div>
  )

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => !saving && setOpen(o => !o)}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-xl text-xs font-semibold border transition-all w-full justify-between',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-300/50',
            value
              ? 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
              : 'bg-white border-gray-200 text-gray-400 hover:border-teal-200 hover:text-teal-600',
            saving && 'opacity-50 cursor-wait',
          )}
        >
          <span className="truncate">{saving ? 'Saving…' : selectedName ?? 'Assign trainer'}</span>
          {saving
            ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            : <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />}
        </button>
        {value && !saving && (
          <button onClick={onClear}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all shrink-0"
            title="Remove assignment">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute right-0 z-40 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/60 overflow-hidden">
            <div className="p-2.5 border-b border-gray-50">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search trainers…"
                  className="text-xs bg-transparent outline-none flex-1 text-gray-700 placeholder:text-gray-400" />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1.5">
              {filteredQ.length > 0 && (
                <>
                  <li className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Qualified</li>
                  {filteredQ.map(t => (
                    <li key={t.id}>
                      <button onClick={() => { onChange(t.id); close() }}
                        className={cn(
                          'w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center gap-2',
                          t.id === value ? 'text-teal-700 font-semibold bg-teal-50' : 'text-gray-700 hover:bg-gray-50',
                        )}>
                        <span className="flex-1 truncate">{t.name}</span>
                        {t.id === value && <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </>
              )}
              {filteredO.length > 0 && (
                <>
                  <li className="px-3.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-t border-gray-50 mt-1">
                    Other trainers
                  </li>
                  {filteredO.map(t => (
                    <li key={t.id}>
                      <button onClick={() => { onChange(t.id); close() }}
                        className={cn(
                          'w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center gap-2',
                          t.id === value ? 'text-teal-700 font-semibold bg-teal-50' : 'text-gray-600 hover:bg-gray-50',
                        )}>
                        <span className="flex-1 truncate">{t.short_name}</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{t.full_name}</span>
                        {t.id === value && <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </>
              )}
              {filteredQ.length === 0 && filteredO.length === 0 && (
                <li className="px-3 py-8 text-xs text-gray-400 text-center">No trainers found</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Progress Ring — teal ─────────────────────────────────────────────────────

function ProgressRing({ pct, allDone }: { pct: number; allDone: boolean }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f0fdfa" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={allDone ? '#10b981' : '#14b8a6'}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        className="transition-all duration-700"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700"
        fill={allDone ? '#10b981' : '#0d9488'}>
        {pct}%
      </text>
    </svg>
  )
}

// ─── Unit Card ────────────────────────────────────────────────────────────────

function UnitCard({
  code, name, type, periodsPerWeek, isOutsourced, dirty, qualifiedTrainers,
  currentTrainerId, saving, cohorts, allTrainers, onAssign, onClear, isLocked, lockedReason,
}: {
  code: string; name: string; type: string; periodsPerWeek: number
  isOutsourced: boolean; dirty: boolean; qualifiedTrainers: QualifiedTrainer[]
  currentTrainerId: string | null; saving: boolean
  cohorts?: { cohortId: string; cohortName: string; unitId: string }[]
  allTrainers: Trainer[]
  onAssign: (id: string) => void; onClear: () => void
  isLocked?: boolean; lockedReason?: string
}) {
  const isAssigned = !!currentTrainerId

  return (
    <div className={cn(
      'group relative bg-white rounded-2xl border transition-all duration-200',
      dirty
        ? 'border-teal-200 shadow-sm shadow-teal-50'
        : isAssigned
          ? 'border-teal-100 shadow-sm hover:shadow-md hover:border-teal-200'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200',
    )}>
      {/* Teal left accent */}
      <div className={cn(
        'absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300',
        isAssigned ? 'bg-teal-400' : 'bg-gray-100 group-hover:bg-teal-200',
      )} />

      <div className="pl-5 pr-4 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-mono text-[11px] font-bold text-gray-400 tracking-tight shrink-0">{code}</span>
            <TypeBadge type={type} />
            <span className="text-[10px] text-gray-400 font-medium shrink-0">{periodsPerWeek}×/wk</span>
            {isOutsourced && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 font-semibold shrink-0">
                Outsourced
              </span>
            )}
            {dirty && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100 font-semibold shrink-0">
                Unsaved
              </span>
            )}
            {qualifiedTrainers.length === 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium shrink-0">
                <AlertCircle className="h-2.5 w-2.5" /> No qualified
              </span>
            )}
          </div>
          {isAssigned && <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />}
        </div>

        {/* Unit name */}
        <p className="text-sm font-semibold text-gray-800 leading-snug mb-3">{name}</p>

        {/* Cohort pills — neutral, not violet */}
        {cohorts && cohorts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cohorts.map(c => (
              <span key={c.cohortId}
                className="text-[10px] px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100 font-semibold">
                {c.cohortName}
              </span>
            ))}
          </div>
        )}

        <TrainerDropdown
          trainers={qualifiedTrainers} allTrainers={allTrainers}
          value={currentTrainerId} saving={saving}
          onChange={onAssign} onClear={onClear}
          isLocked={isLocked} lockedReason={lockedReason}
        />
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle, assigned, total,
}: { icon: React.ReactNode; title: string; subtitle: string; assigned: number; total: number }) {
  const done = assigned === total
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-xl border shrink-0',
        done ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-gray-50 border-gray-200 text-gray-500',
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-gray-900 truncate">{title}</h2>
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
      </div>
      <span className={cn(
        'text-xs font-bold tabular-nums px-3 py-1 rounded-full shrink-0',
        done ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500',
      )}>
        {assigned}/{total}
      </span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnitsOnOfferPage() {
  const { activeTerm } = useTermStore()

  const [allTrainers,    setAllTrainers]    = useState<Trainer[]>([])
  const [combinedRows,   setCombinedRows]   = useState<CombinedRow[]>([])
  const [cohortSections, setCohortSections] = useState<CohortSection[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [globalSaving,   setGlobalSaving]   = useState(false)
  const [savedAt,        setSavedAt]        = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const termId = activeTerm?.id
      const [cohortsRaw, trainersRaw, programsRaw] = await Promise.all([
        fetchAll<Cohort[]>('/cohorts/'),
        fetchAll<Trainer[]>('/trainers/'),
        fetchAll<Programme[]>('/programmes/'),
      ])
      setAllTrainers(trainersRaw as Trainer[])

      const sharingGroupMap = new Map<string, string>()
      ;(programsRaw as Programme[]).forEach(p => sharingGroupMap.set(p.id, p.sharing_group ?? ''))

      const cohortUnitPairs = await Promise.all(
        (cohortsRaw as Cohort[]).map(async cohort => {
          try {
            const units = await fetchAll<CurriculumUnit[]>(
              `/curriculum/?programme=${cohort.programme_id}&term_number=${cohort.current_term}`
            )
            return { cohort, units: Array.isArray(units) ? units : [] }
          } catch { return { cohort, units: [] } }
        })
      )

      let existingAssignments: any[] = []
      if (termId) {
        try { existingAssignments = await fetchAll<any[]>(`/term-assignments/?term=${termId}`) } catch {}
      }

      const assignmentMap = new Map<string, string>()
      existingAssignments.forEach(a => assignmentMap.set(`${a.curriculum_unit_id}|${a.cohort_id}`, a.trainer_id))

      type RawEntry = {
        cohortId: string; cohortName: string; unitId: string; unitCode: string
        unitName: string; unitType: string; periodsPerWeek: number
        isOutsourced: boolean; qualifiedTrainers: QualifiedTrainer[]
        assignedTrainerId: string | null
      }
      const keyToEntries = new Map<string, RawEntry[]>()

      cohortUnitPairs.forEach(({ cohort, units }) => {
        const sg = sharingGroupMap.get(cohort.programme_id) ?? cohort.programme_id
        units.forEach(u => {
          const key = `${sg}||${u.code.replace(/^[A-Z]+/, '')}||${u.name.trim().toLowerCase()}`
          if (!keyToEntries.has(key)) keyToEntries.set(key, [])
          keyToEntries.get(key)!.push({
            cohortId: cohort.id, cohortName: cohort.name,
            unitId: u.id, unitCode: u.code, unitName: u.name,
            unitType: u.unit_type, periodsPerWeek: u.periods_per_week,
            isOutsourced: u.is_outsourced,
            qualifiedTrainers: u.qualified_trainers ?? [],
            assignedTrainerId: assignmentMap.get(`${u.id}|${cohort.id}`) ?? null,
          })
        })
      })

      const combinedUnitIds = new Set<string>()
      const newCombined: CombinedRow[] = []

      keyToEntries.forEach((entries, key) => {
        if (entries.length >= 2) {
          entries.forEach(e => combinedUnitIds.add(e.unitId))
          const qtMap = new Map<string, QualifiedTrainer>()
          entries.forEach(e => e.qualifiedTrainers.forEach(qt => qtMap.set(qt.id, qt)))
          newCombined.push({
            key,
            unitName: entries[0].unitName, unitCode: entries[0].unitCode,
            unitType: entries[0].unitType, periodsPerWeek: entries[0].periodsPerWeek,
            isOutsourced: entries[0].isOutsourced,
            qualifiedTrainers: Array.from(qtMap.values()),
            cohorts: entries.map(e => ({ cohortId: e.cohortId, cohortName: e.cohortName, unitId: e.unitId })),
            currentTrainerId: entries.find(e => e.assignedTrainerId)?.assignedTrainerId ?? null,
            saving: false, dirty: false,
          })
        }
      })

      const newSections: CohortSection[] = cohortUnitPairs
        .filter(({ units }) => units.length > 0)
        .map(({ cohort, units }) => ({
          cohortId: cohort.id, cohortName: cohort.name,
          programme: cohort.programme, currentTerm: cohort.current_term,
          units: units
            .filter(u => !combinedUnitIds.has(u.id))
            .map(u => ({
              unitId: u.id, unitCode: u.code, unitName: u.name,
              unitType: u.unit_type, periodsPerWeek: u.periods_per_week,
              isOutsourced: u.is_outsourced,
              qualifiedTrainers: u.qualified_trainers ?? [],
              currentTrainerId: assignmentMap.get(`${u.id}|${cohort.id}`) ?? null,
              saving: false, dirty: false,
            })),
        }))
        .filter(s => s.units.length > 0)

      setCombinedRows(newCombined)
      setCohortSections(newSections)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTerm?.id])

  useEffect(() => { load() }, [load])

  const setCombinedTrainer = (key: string, trainerId: string | null) =>
    setCombinedRows(prev => prev.map(r => r.key === key ? { ...r, currentTrainerId: trainerId, dirty: true } : r))

  const setUnitTrainer = (cohortId: string, unitId: string, trainerId: string | null) =>
    setCohortSections(prev => prev.map(s =>
      s.cohortId !== cohortId ? s : {
        ...s, units: s.units.map(u => u.unitId === unitId ? { ...u, currentTrainerId: trainerId, dirty: true } : u),
      }
    ))

  const saveAll = async () => {
    if (!activeTerm?.id) return
    setGlobalSaving(true)
    const assignments: any[] = []
    combinedRows.forEach(row => {
      if (!row.currentTrainerId) return
      row.cohorts.forEach(c => assignments.push({
        term_id: activeTerm.id, cohort_id: c.cohortId,
        curriculum_unit_id: c.unitId, trainer_id: row.currentTrainerId!,
      }))
    })
    cohortSections.forEach(sec => {
      sec.units.forEach(u => {
        if (!u.currentTrainerId) return
        assignments.push({
          term_id: activeTerm.id, cohort_id: sec.cohortId,
          curriculum_unit_id: u.unitId, trainer_id: u.currentTrainerId,
        })
      })
    })
    try {
      await api.post('/term-assignments/bulk/', { term_id: activeTerm.id, assignments })
      setCombinedRows(prev => prev.map(r => ({ ...r, dirty: false })))
      setCohortSections(prev => prev.map(s => ({ ...s, units: s.units.map(u => ({ ...u, dirty: false })) })))
      setSavedAt(new Date())
    } catch (e: any) {
      alert('Save failed: ' + (e?.message ?? 'unknown error'))
    } finally {
      setGlobalSaving(false)
    }
  }

  const allUnits   = [...combinedRows, ...cohortSections.flatMap(s => s.units)]
  const total      = allUnits.length
  const assigned   = allUnits.filter(u => u.currentTrainerId).length
  const pct        = total ? Math.round((assigned / total) * 100) : 0
  const allDone    = total > 0 && assigned === total
  const hasDirty   = allUnits.some(u => u.dirty)
  const dirtyCount = allUnits.filter(u => u.dirty).length

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading units…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-gray-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 mb-1">Something went wrong</p>
        <p className="text-xs text-gray-400 max-w-xs">{error}</p>
      </div>
      <button onClick={load}
        className="flex items-center gap-2 text-xs font-semibold text-teal-600 hover:text-teal-700 border border-teal-200 rounded-xl px-5 py-2.5 hover:bg-teal-50 transition-all">
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            {/* Teal accent pip */}
            <div className="flex items-center gap-3 mb-1">
              <div className="h-5 w-[3px] rounded-full bg-teal-500 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Units on Offer</h1>
            </div>
            <p className="ml-[18px] text-sm text-gray-400">
              {activeTerm
                ? <>Assign trainers for <span className="font-semibold text-gray-600">{activeTerm.name}</span></>
                : "Assign trainers to each cohort's curriculum units"
              }
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={load}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={saveAll}
              disabled={globalSaving || (!hasDirty && assigned === 0)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                hasDirty || assigned > 0
                  ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {globalSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Saving…</span></>
                : <><Save className="h-3.5 w-3.5" /><span>Save All</span></>}
            </button>
          </div>
        </div>

        {/* Saved confirmation */}
        {savedAt && (
          <div className="flex items-center gap-2 mb-5 text-xs font-medium text-teal-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved at {savedAt.toLocaleTimeString()}
          </div>
        )}

        {/* ── Main layout ── */}
        <div className="xl:grid xl:grid-cols-[1fr_268px] xl:gap-6 xl:items-start">

          {/* ── Left / main content ── */}
          <div className="space-y-6 sm:space-y-8 min-w-0">

            {/* Progress card — mobile/tablet only */}
            <div className="xl:hidden bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <ProgressRing pct={pct} allDone={allDone} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assignment Progress</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', allDone ? 'bg-teal-400' : 'bg-teal-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-gray-400">{assigned} assigned</span>
                    <span className="text-xs text-gray-400">{total - assigned} remaining</span>
                  </div>
                </div>
              </div>
              {allDone && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-100 px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />
                  <p className="text-xs font-semibold text-teal-700">All units assigned — ready to generate.</p>
                </div>
              )}
            </div>

            {/* ── Combined units ── */}
            {combinedRows.length > 0 && (
              <section className="space-y-3">
                <SectionHeader
                  icon={<Link2 className="h-4 w-4" />}
                  title="Combined Units"
                  subtitle="Shared across multiple cohorts"
                  assigned={combinedRows.filter(r => r.currentTrainerId).length}
                  total={combinedRows.length}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                  {combinedRows.map(row => (
                    <UnitCard
                      key={row.key}
                      code={row.unitCode} name={row.unitName} type={row.unitType}
                      periodsPerWeek={row.periodsPerWeek} isOutsourced={row.isOutsourced}
                      dirty={row.dirty} qualifiedTrainers={row.qualifiedTrainers}
                      currentTrainerId={row.currentTrainerId} saving={row.saving}
                      cohorts={row.cohorts} allTrainers={allTrainers}
                      onAssign={id => setCombinedTrainer(row.key, id)}
                      onClear={() => setCombinedTrainer(row.key, null)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Per-cohort sections ── */}
            {cohortSections.map(sec => {
              const secAssigned = sec.units.filter(u => u.currentTrainerId).length
              return (
                <section key={sec.cohortId} className="space-y-3">
                  <SectionHeader
                    icon={<Users className="h-4 w-4" />}
                    title={sec.cohortName}
                    subtitle={`${sec.programme} · Term ${sec.currentTerm}`}
                    assigned={secAssigned}
                    total={sec.units.length}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                    {sec.units.map(unit => (
                      <UnitCard
                        key={unit.unitId}
                        code={unit.unitCode} name={unit.unitName} type={unit.unitType}
                        periodsPerWeek={unit.periodsPerWeek} isOutsourced={unit.isOutsourced}
                        dirty={unit.dirty} qualifiedTrainers={unit.qualifiedTrainers}
                        currentTrainerId={unit.currentTrainerId} saving={unit.saving}
                        allTrainers={allTrainers}
                        onAssign={id => setUnitTrainer(sec.cohortId, unit.unitId, id)}
                        onClear={() => setUnitTrainer(sec.cohortId, unit.unitId, null)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {/* ── Empty state ── */}
            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No units on offer</p>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Make sure cohorts have a current term and curriculum units are defined.
                  </p>
                </div>
                <button onClick={load}
                  className="flex items-center gap-2 text-xs font-semibold text-teal-600 border border-teal-200 rounded-xl px-5 py-2.5 hover:bg-teal-50 transition-all">
                  <RefreshCw className="h-3.5 w-3.5" /> Reload
                </button>
              </div>
            )}

            {hasDirty && <div className="h-16" />}
          </div>

          {/* ── Sidebar — xl+ only ── */}
          <div className="hidden xl:block">
            <div className="sticky top-6 space-y-4">

              {/* Progress card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Progress</p>
                <div className="flex flex-col items-center gap-4">
                  <ProgressRing pct={pct} allDone={allDone} />
                  <div className="w-full">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', allDone ? 'bg-teal-400' : 'bg-teal-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-400">{assigned} assigned</span>
                      <span className="text-xs text-gray-400">{total - assigned} left</span>
                    </div>
                  </div>
                </div>
                {allDone && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />
                    <p className="text-xs font-semibold text-teal-700 leading-snug">All assigned — ready to generate.</p>
                  </div>
                )}
              </div>

              {/* Section breakdown */}
              {(combinedRows.length > 0 || cohortSections.length > 0) && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sections</p>
                  <div className="space-y-2.5">
                    {combinedRows.length > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-600 truncate font-medium">Combined</span>
                        </div>
                        <span className={cn(
                          'text-xs font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0',
                          combinedRows.filter(r => r.currentTrainerId).length === combinedRows.length
                            ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500',
                        )}>
                          {combinedRows.filter(r => r.currentTrainerId).length}/{combinedRows.length}
                        </span>
                      </div>
                    )}
                    {cohortSections.map(sec => {
                      const sa = sec.units.filter(u => u.currentTrainerId).length
                      const done = sa === sec.units.length
                      return (
                        <div key={sec.cohortId} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-600 truncate font-medium">{sec.cohortName}</span>
                          </div>
                          <span className={cn(
                            'text-xs font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0',
                            done ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500',
                          )}>
                            {sa}/{sec.units.length}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Save button */}
              {(hasDirty || assigned > 0) && (
                <button
                  onClick={saveAll} disabled={globalSaving}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                    'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]',
                    globalSaving && 'opacity-70 cursor-wait',
                  )}
                >
                  {globalSaving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : <><Save className="h-4 w-4" /> Save {hasDirty ? `${dirtyCount} change${dirtyCount !== 1 ? 's' : ''}` : 'All'}</>
                  }
                </button>
              )}

              {savedAt && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-teal-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved at {savedAt.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky save bar — mobile/tablet ── */}
      {hasDirty && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm">
            <button
              onClick={saveAll} disabled={globalSaving}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all',
                'bg-teal-600 text-white shadow-xl shadow-teal-500/20',
                'hover:bg-teal-700 active:scale-[0.98]',
                globalSaving && 'opacity-70 cursor-wait',
              )}
            >
              {globalSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4" /> Save {dirtyCount} change{dirtyCount !== 1 ? 's' : ''}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}