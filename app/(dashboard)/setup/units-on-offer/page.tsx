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

interface Trainer {
  id: string
  full_name: string
  short_name: string
}

interface QualifiedTrainer {
  id: string
  name: string
}

interface CurriculumUnit {
  id: string
  code: string
  name: string
  unit_type: string
  periods_per_week: number
  is_outsourced: boolean
  qualified_trainers: QualifiedTrainer[]
}

interface Cohort {
  id: string
  name: string
  current_term: number
  programme: string
  programme_id: string
  start_year: number
  start_month: number
}

interface Programme {
  id: string
  code: string
  name: string
  total_terms: number
  sharing_group: string
}

interface UnitRow {
  unitId: string
  unitCode: string
  unitName: string
  unitType: string
  periodsPerWeek: number
  isOutsourced: boolean
  qualifiedTrainers: QualifiedTrainer[]
  currentTrainerId: string | null
  saving: boolean
  dirty: boolean
}

interface CombinedRow {
  key: string
  unitName: string
  unitCode: string
  unitType: string
  periodsPerWeek: number
  isOutsourced: boolean
  qualifiedTrainers: QualifiedTrainer[]
  cohorts: { cohortId: string; cohortName: string; unitId: string }[]
  currentTrainerId: string | null
  saving: boolean
  dirty: boolean
}

interface CohortSection {
  cohortId: string
  cohortName: string
  programme: string
  currentTerm: number
  units: UnitRow[]
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

// ─── TrainerDropdown ──────────────────────────────────────────────────────────

function TrainerDropdown({
  trainers,
  allTrainers,
  value,
  saving,
  onChange,
  onClear,
  isLocked,
  lockedReason,
}: {
  trainers: QualifiedTrainer[]
  allTrainers: Trainer[]
  value: string | null
  saving: boolean
  onChange: (id: string) => void
  onClear: () => void
  isLocked?: boolean
  lockedReason?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const qualifiedIds = new Set(trainers.map(t => t.id))
  const qualifiedList = trainers
  const otherList = allTrainers.filter(t => !qualifiedIds.has(t.id))

  const filterFn = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase())

  const filteredQualified = qualifiedList.filter(t => filterFn(t.name))
  const filteredOthers    = otherList.filter(t =>
    filterFn(t.full_name) || filterFn(t.short_name)
  )

  const selectedName =
    qualifiedList.find(t => t.id === value)?.name ??
    allTrainers.find(t => t.id === value)?.short_name ??
    null

  const close = () => { setOpen(false); setSearch('') }

  if (isLocked) {
    return (
      <div
        title={lockedReason}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 cursor-not-allowed"
      >
        <Link2 className="h-3 w-3" />
        <span className="truncate">{selectedName ?? 'Linked to combined'}</span>
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-1.5 w-full sm:w-auto shrink-0">
      <button
        onClick={() => !saving && setOpen(o => !o)}
        disabled={saving}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-56 justify-between shadow-sm',
          value
            ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-white border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-slate-700',
          saving && 'opacity-50 cursor-wait',
        )}
      >
        <span className="truncate">
          {saving ? 'Saving…' : selectedName ?? 'Assign trainer'}
        </span>
        {saving
          ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          : <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />}
      </button>

      {value && !saving && (
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
          title="Remove assignment"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" style={{ top: '100%', marginTop: 6 }}>
            <div className="p-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Search className="h-3 w-3 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search trainers…"
                  className="text-xs bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            <ul className="max-h-56 overflow-y-auto py-1.5">
              {filteredQualified.length > 0 && (
                <>
                  <li className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Qualified
                  </li>
                  {filteredQualified.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => { onChange(t.id); close() }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs transition-colors hover:bg-indigo-50 flex items-center gap-2',
                          t.id === value ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-700',
                        )}
                      >
                        <span className="flex-1 truncate">{t.name}</span>
                        {t.id === value && <CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </>
              )}

              {filteredOthers.length > 0 && (
                <>
                  <li className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 mt-1">
                    Other trainers
                  </li>
                  {filteredOthers.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => { onChange(t.id); close() }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 flex items-center gap-2',
                          t.id === value ? 'text-indigo-600 font-semibold' : 'text-slate-600',
                        )}
                      >
                        <span className="flex-1 truncate">{t.short_name}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{t.full_name}</span>
                        {t.id === value && <CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </>
              )}

              {filteredQualified.length === 0 && filteredOthers.length === 0 && (
                <li className="px-3 py-6 text-xs text-slate-400 text-center">No trainers found</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Unit type badge ──────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
  Core:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  Elective:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  Practical: 'bg-amber-100 text-amber-700 border-amber-200',
  Project:   'bg-rose-100 text-rose-700 border-rose-200',
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
      TYPE_STYLES[type] ?? 'bg-slate-100 text-slate-600 border-slate-200',
    )}>
      {type}
    </span>
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
    setLoading(true)
    setError(null)
    try {
      const termId = activeTerm?.id

      const [cohortsRaw, trainersRaw, programsRaw] = await Promise.all([
        fetchAll<Cohort[]>('/cohorts/'),
        fetchAll<Trainer[]>('/trainers/'),
        fetchAll<Programme[]>('/programmes/'),
      ])

      setAllTrainers(trainersRaw as Trainer[])

      const sharingGroupMap = new Map<string, string>()
      ;(programsRaw as Programme[]).forEach(p =>
        sharingGroupMap.set(p.id, p.sharing_group ?? '')
      )

      const cohortUnitPairs: { cohort: Cohort; units: CurriculumUnit[] }[] =
        await Promise.all(
          (cohortsRaw as Cohort[]).map(async cohort => {
            try {
              const units = await fetchAll<CurriculumUnit[]>(
                `/curriculum/?programme=${cohort.programme_id}&term_number=${cohort.current_term}`
              )
              return { cohort, units: Array.isArray(units) ? units : [] }
            } catch {
              return { cohort, units: [] }
            }
          })
        )

      let existingAssignments: any[] = []
      if (termId) {
        try {
          existingAssignments = await fetchAll<any[]>(
            `/term-assignments/?term=${termId}`
          )
        } catch { /* no assignments yet */ }
      }

      const assignmentMap = new Map<string, string>()
      existingAssignments.forEach(a => {
        assignmentMap.set(`${a.curriculum_unit_id}|${a.cohort_id}`, a.trainer_id)
      })

      type RawEntry = {
        cohortId: string; cohortName: string
        unitId: string; unitCode: string; unitName: string
        unitType: string; periodsPerWeek: number
        isOutsourced: boolean
        qualifiedTrainers: QualifiedTrainer[]
        assignedTrainerId: string | null
      }
      const keyToEntries = new Map<string, RawEntry[]>()

      cohortUnitPairs.forEach(({ cohort, units }) => {
        const sg = sharingGroupMap.get(cohort.programme_id) ?? cohort.programme_id
        units.forEach(u => {
          const codeBase = u.code.replace(/^[A-Z]+/, '')
          const key = `${sg}||${codeBase}||${u.name.trim().toLowerCase()}`
          if (!keyToEntries.has(key)) keyToEntries.set(key, [])
          keyToEntries.get(key)!.push({
            cohortId:          cohort.id,
            cohortName:        cohort.name,
            unitId:            u.id,
            unitCode:          u.code,
            unitName:          u.name,
            unitType:          u.unit_type,
            periodsPerWeek:    u.periods_per_week,
            isOutsourced:      u.is_outsourced,
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
          const assignedId = entries.find(e => e.assignedTrainerId)?.assignedTrainerId ?? null
          const qtMap = new Map<string, QualifiedTrainer>()
          entries.forEach(e => e.qualifiedTrainers.forEach(qt => qtMap.set(qt.id, qt)))
          newCombined.push({
            key,
            unitName:          entries[0].unitName,
            unitCode:          entries[0].unitCode,
            unitType:          entries[0].unitType,
            periodsPerWeek:    entries[0].periodsPerWeek,
            isOutsourced:      entries[0].isOutsourced,
            qualifiedTrainers: Array.from(qtMap.values()),
            cohorts:           entries.map(e => ({
              cohortId:   e.cohortId,
              cohortName: e.cohortName,
              unitId:     e.unitId,
            })),
            currentTrainerId: assignedId,
            saving:           false,
            dirty:            false,
          })
        }
      })

      const newSections: CohortSection[] = cohortUnitPairs
        .filter(({ units }) => units.length > 0)
        .map(({ cohort, units }) => ({
          cohortId:   cohort.id,
          cohortName: cohort.name,
          programme:  cohort.programme,
          currentTerm: cohort.current_term,
          units: units
            .filter(u => !combinedUnitIds.has(u.id))
            .map(u => ({
              unitId:            u.id,
              unitCode:          u.code,
              unitName:          u.name,
              unitType:          u.unit_type,
              periodsPerWeek:    u.periods_per_week,
              isOutsourced:      u.is_outsourced,
              qualifiedTrainers: u.qualified_trainers ?? [],
              currentTrainerId:  assignmentMap.get(`${u.id}|${cohort.id}`) ?? null,
              saving:            false,
              dirty:             false,
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

  const setCombinedTrainer = (key: string, trainerId: string | null) => {
    setCombinedRows(prev => prev.map(r =>
      r.key === key ? { ...r, currentTrainerId: trainerId, dirty: true } : r
    ))
  }

  const setUnitTrainer = (cohortId: string, unitId: string, trainerId: string | null) => {
    setCohortSections(prev => prev.map(s =>
      s.cohortId !== cohortId ? s : {
        ...s,
        units: s.units.map(u =>
          u.unitId === unitId ? { ...u, currentTrainerId: trainerId, dirty: true } : u
        ),
      }
    ))
  }

  const saveAll = async () => {
    if (!activeTerm?.id) return
    setGlobalSaving(true)

    const assignments: {
      term_id: string
      cohort_id: string
      curriculum_unit_id: string
      trainer_id: string
    }[] = []

    combinedRows.forEach(row => {
      if (!row.currentTrainerId) return
      row.cohorts.forEach(c => {
        assignments.push({
          term_id:            activeTerm.id,
          cohort_id:          c.cohortId,
          curriculum_unit_id: c.unitId,
          trainer_id:         row.currentTrainerId!,
        })
      })
    })

    cohortSections.forEach(sec => {
      sec.units.forEach(u => {
        if (!u.currentTrainerId) return
        assignments.push({
          term_id:            activeTerm.id,
          cohort_id:          sec.cohortId,
          curriculum_unit_id: u.unitId,
          trainer_id:         u.currentTrainerId,
        })
      })
    })

    try {
      await api.post('/term-assignments/bulk/', {
        term_id:     activeTerm.id,
        assignments,
      })
      setCombinedRows(prev => prev.map(r => ({ ...r, dirty: false })))
      setCohortSections(prev => prev.map(s => ({
        ...s,
        units: s.units.map(u => ({ ...u, dirty: false })),
      })))
      setSavedAt(new Date())
    } catch (e: any) {
      alert('Save failed: ' + (e?.message ?? 'unknown error'))
    } finally {
      setGlobalSaving(false)
    }
  }

  const allUnits = [
    ...combinedRows,
    ...cohortSections.flatMap(s => s.units),
  ]
  const total    = allUnits.length
  const assigned = allUnits.filter(u => u.currentTrainerId).length
  const pct      = total ? Math.round((assigned / total) * 100) : 0
  const allDone  = total > 0 && assigned === total
  const hasDirty = allUnits.some(u => u.dirty)

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">Loading units…</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-rose-500" />
      </div>
      <p className="text-sm font-medium text-slate-700">{error}</p>
      <button
        onClick={load}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-all"
      >
        <RefreshCw className="h-3 w-3" /> Try again
      </button>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Units on Offer
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Assign trainers to each cohort's units for
              {activeTerm
                ? <span className="ml-1 font-semibold text-slate-700">{activeTerm.name}</span>
                : ' the current term'
              }.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={saveAll}
              disabled={globalSaving || (!hasDirty && assigned === 0)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm',
                hasDirty || assigned > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed',
              )}
            >
              {globalSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><Save className="h-3.5 w-3.5" /> Save All</>}
            </button>
          </div>
        </div>

        {savedAt && (
          <div className="flex items-center gap-2 -mt-6 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved at {savedAt.toLocaleTimeString()}
          </div>
        )}

        {/* ── Progress card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Assignment progress</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {total - assigned} unit{total - assigned !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <span className={cn(
              'text-2xl font-bold tabular-nums',
              allDone ? 'text-emerald-500' : 'text-indigo-600',
            )}>
              {pct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                allDone ? 'bg-emerald-500' : 'bg-indigo-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400">{assigned} assigned</span>
            <span className="text-xs text-slate-400">{total} total</span>
          </div>
          {allDone && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">
                All units assigned — ready to generate the timetable.
              </p>
            </div>
          )}
        </div>

        {/* ── Combined units ── */}
        {combinedRows.length > 0 && (
          <section className="space-y-4">
            {/* Section label */}
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 border border-violet-200">
                <Link2 className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Combined Units</h2>
                <p className="text-xs text-slate-400">Shared across multiple cohorts</p>
              </div>
              <span className={cn(
                'ml-auto text-xs font-bold tabular-nums px-2.5 py-1 rounded-full',
                combinedRows.filter(r => r.currentTrainerId).length === combinedRows.length
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              )}>
                {combinedRows.filter(r => r.currentTrainerId).length}/{combinedRows.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {combinedRows.map(row => (
                <div
                  key={row.key}
                  className={cn(
                    'rounded-xl border bg-white shadow-sm transition-all',
                    row.dirty
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : row.currentTrainerId
                        ? 'border-emerald-200'
                        : 'border-slate-200',
                  )}
                >
                  {/* Card top strip */}
                  <div className={cn(
                    'h-1 rounded-t-xl',
                    row.currentTrainerId ? 'bg-emerald-400' : 'bg-slate-200'
                  )} />

                  <div className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Unit info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                            {row.unitCode}
                          </span>
                          <TypeBadge type={row.unitType} />
                          <span className="text-xs text-slate-400 font-medium">
                            {row.periodsPerWeek}×/wk
                          </span>
                          {row.isOutsourced && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-bold">
                              Outsourced
                            </span>
                          )}
                          {row.dirty && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                              Unsaved
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-700 leading-snug">
                          {row.unitName}
                        </p>

                        {/* Cohort pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {row.cohorts.map(c => (
                            <span
                              key={c.cohortId}
                              className="text-[10px] px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-semibold"
                            >
                              {c.cohortName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Trainer dropdown */}
                      <div className="flex items-center gap-2">
                        {row.currentTrainerId && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        <TrainerDropdown
                          trainers={row.qualifiedTrainers}
                          allTrainers={allTrainers}
                          value={row.currentTrainerId}
                          saving={row.saving}
                          onChange={id => setCombinedTrainer(row.key, id)}
                          onClear={() => setCombinedTrainer(row.key, null)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Per-cohort sections ── */}
        {cohortSections.map(sec => {
          const secAssigned = sec.units.filter(u => u.currentTrainerId).length
          const secTotal    = sec.units.length
          const secDone     = secAssigned === secTotal

          return (
            <section key={sec.cohortId} className="space-y-4">
              {/* Section label */}
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 border border-slate-300">
                  <Users className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{sec.cohortName}</h2>
                  <p className="text-xs text-slate-400">{sec.programme} · Term {sec.currentTerm}</p>
                </div>
                <span className={cn(
                  'ml-auto text-xs font-bold tabular-nums px-2.5 py-1 rounded-full',
                  secDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {secAssigned}/{secTotal}
                </span>
              </div>

              {/* Unit cards */}
              <div className="space-y-2">
                {sec.units.map(unit => (
                  <div
                    key={unit.unitId}
                    className={cn(
                      'rounded-xl border bg-white shadow-sm transition-all',
                      unit.dirty
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : unit.currentTrainerId
                          ? 'border-emerald-200'
                          : 'border-slate-200',
                    )}
                  >
                    {/* Status strip */}
                    <div className={cn(
                      'h-0.5 rounded-t-xl',
                      unit.currentTrainerId ? 'bg-emerald-400' : 'bg-slate-200'
                    )} />

                    <div className="px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                              {unit.unitCode}
                            </span>
                            <TypeBadge type={unit.unitType} />
                            <span className="text-xs text-slate-400 font-medium">
                              {unit.periodsPerWeek}×/wk
                            </span>
                            {unit.isOutsourced && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-bold">
                                Outsourced
                              </span>
                            )}
                            {unit.qualifiedTrainers.length === 0 && (
                              <span className="text-[10px] text-amber-600 flex items-center gap-1 font-semibold">
                                <AlertCircle className="h-3 w-3" /> No qualified trainers
                              </span>
                            )}
                            {unit.dirty && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                                Unsaved
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-600 leading-snug">
                            {unit.unitName}
                          </p>
                        </div>

                        {/* Dropdown */}
                        <div className="flex items-center gap-2">
                          {unit.currentTrainerId && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          <TrainerDropdown
                            trainers={unit.qualifiedTrainers}
                            allTrainers={allTrainers}
                            value={unit.currentTrainerId}
                            saving={unit.saving}
                            onChange={id => setUnitTrainer(sec.cohortId, unit.unitId, id)}
                            onClear={() => setUnitTrainer(sec.cohortId, unit.unitId, null)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* ── Empty state ── */}
        {total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-700">No units on offer</p>
              <p className="text-xs text-slate-400">
                Make sure cohorts have a current term and curriculum units are defined.
              </p>
            </div>
          </div>
        )}

        {/* ── Sticky save bar ── */}
        {hasDirty && (
          <div className="sticky bottom-6 flex justify-center">
            <button
              onClick={saveAll}
              disabled={globalSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              {globalSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4" /> Save {allUnits.filter(u => u.dirty).length} change{allUnits.filter(u => u.dirty).length !== 1 ? 's' : ''}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}