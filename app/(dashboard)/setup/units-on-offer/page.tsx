'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, AlertCircle, Search, Users, BookOpen,
  Loader2, ChevronDown, RefreshCw, X, Link2,
} from 'lucide-react'
import api from '@/lib/api'
import { useTermStore } from '@/store/index'

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
  isOutsourced: boolean
  currentTrainerId: string | null
  currentTrainerName: string | null
  saving: boolean
}

interface CombinedRow {
  unitName: string        // shared name key
  unitCode: string        // representative code (first cohort's)
  isOutsourced: boolean
  cohorts: { cohortId: string; cohortName: string; unitId: string; unitCode: string }[]
  currentTrainerId: string | null
  currentTrainerName: string | null
  saving: boolean
}

interface CohortSection {
  cohortId: string
  cohortName: string
  programme: string
  currentTerm: number
  units: UnitRow[]         // units unique to this cohort
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

// ─── TrainerSelect ────────────────────────────────────────────────────────────

function TrainerSelect({ trainers, value, saving, onChange, onUnassign }: {
  trainers: Trainer[]
  value: string | null
  saving: boolean
  onChange: (id: string) => void
  onUnassign: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = trainers.find(t => t.id === value)
  const filtered = trainers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.short_name.toLowerCase().includes(search.toLowerCase())
  )
  const close = () => { setOpen(false); setSearch('') }

  return (
    <div className="relative flex items-center gap-1 shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-48 justify-between border transition-colors',
          value ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
          saving ? 'opacity-60 cursor-wait' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="truncate text-xs">
          {saving ? 'Saving…' : (selected?.short_name ?? 'Assign trainer…')}
        </span>
        {saving
          ? <Loader2 size={12} className="animate-spin shrink-0" />
          : <ChevronDown size={12} className="shrink-0 opacity-50" />}
      </button>

      {value && !saving && (
        <button
          onClick={() => { onUnassign(); close() }}
          title="Remove assignment"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
        >
          <X size={13} />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden" style={{ top: '100%', marginTop: 4 }}>
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                <Search size={12} className="text-slate-400" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search trainers…"
                  className="text-sm bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400" />
              </div>
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-400 text-center">No trainers found</li>}
              {filtered.map(t => (
                <li key={t.id}>
                  <button onClick={() => { onChange(t.id); close() }}
                    className={['w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 flex items-baseline gap-2', t.id === value ? 'text-emerald-700 font-medium' : 'text-slate-700'].join(' ')}>
                    <span className="shrink-0">{t.short_name}</span>
                    <span className="text-xs text-slate-400 truncate">{t.full_name}</span>
                    {t.id === value && <span className="ml-auto text-emerald-400 shrink-0">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnitsOnOfferPage() {
  const { activeTerm } = useTermStore()

  const [trainers, setTrainers]             = useState<Trainer[]>([])
  const [combinedRows, setCombinedRows]     = useState<CombinedRow[]>([])
  const [cohortSections, setCohortSections] = useState<CohortSection[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cohortsRaw, trainersRaw, programsRaw] = await Promise.all([
        fetchAll<Cohort[]>('/cohorts/'),
        fetchAll<Trainer[]>('/trainers/'),
        fetchAll<Programme[]>('/programmes/'),
      ])

      setTrainers(trainersRaw as Trainer[])

      const sharingGroupMap = new Map<string, string>()
      ;(programsRaw as Programme[]).forEach(p => sharingGroupMap.set(p.id, p.sharing_group ?? ''))

      // Fetch current-term units for each cohort using their stored current_term
      const cohortUnits: { cohort: Cohort; units: CurriculumUnit[] }[] = await Promise.all(
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

      // ── Detect combined (shared) units ────────────────────────────────────
      // Key: sharingGroup::codeBase::unitName — same across programmes in same group
      type RawEntry = {
        cohortId: string; cohortName: string
        unitId: string; unitCode: string; unitName: string
        trainerId: string | null; trainerName: string | null
        isOutsourced: boolean
      }
      const keyToEntries = new Map<string, RawEntry[]>()

      cohortUnits.forEach(({ cohort, units }) => {
        const sg = sharingGroupMap.get(cohort.programme_id) ?? cohort.programme_id
        units.forEach(u => {
          const codeBase = u.code.replace(/^[A-Z]+/, '')
          const key = `${sg}||${codeBase}||${u.name.trim().toLowerCase()}`
          if (!keyToEntries.has(key)) keyToEntries.set(key, [])
          const qt = u.qualified_trainers?.[0] ?? null
          keyToEntries.get(key)!.push({
            cohortId: cohort.id,
            cohortName: cohort.name,
            unitId: u.id,
            unitCode: u.code,
            unitName: u.name,
            trainerId: qt?.id ?? null,
            trainerName: qt?.name ?? null,
            isOutsourced: u.is_outsourced,
          })
        })
      })

      // Split into combined (≥2 cohorts) and unique (1 cohort)
      const combinedUnitIds = new Set<string>()
      const newCombined: CombinedRow[] = []

      keyToEntries.forEach((entries) => {
        if (entries.length >= 2) {
          entries.forEach(e => combinedUnitIds.add(e.unitId))
          newCombined.push({
            unitName: entries[0].unitName,
            unitCode: entries[0].unitCode,
            isOutsourced: entries[0].isOutsourced,
            cohorts: entries.map(e => ({ cohortId: e.cohortId, cohortName: e.cohortName, unitId: e.unitId, unitCode: e.unitCode })),
            currentTrainerId: entries[0].trainerId,
            currentTrainerName: entries[0].trainerName,
            saving: false,
          })
        }
      })

      // Per-cohort sections with only their unique units
      const newSections: CohortSection[] = cohortUnits
        .filter(({ units }) => units.length > 0)
        .map(({ cohort, units }) => ({
          cohortId: cohort.id,
          cohortName: cohort.name,
          programme: cohort.programme,
          currentTerm: cohort.current_term,
          units: units
            .filter(u => !combinedUnitIds.has(u.id))
            .map(u => {
              const qt = u.qualified_trainers?.[0] ?? null
              return {
                unitId: u.id,
                unitCode: u.code,
                unitName: u.name,
                isOutsourced: u.is_outsourced,
                currentTrainerId: qt?.id ?? null,
                currentTrainerName: qt?.name ?? null,
                saving: false,
              }
            }),
        }))
        .filter(s => s.units.length > 0)

      setCombinedRows(newCombined)
      setCohortSections(newSections)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTerm?.id])

  useEffect(() => { load() }, [load])

  // ── Assign / unassign helpers ─────────────────────────────────────────────

  async function assignCombined(row: CombinedRow, trainerId: string) {
    const trainer = trainers.find(t => t.id === trainerId)
    const trainerName = trainer?.short_name ?? trainer?.full_name ?? null
    setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, saving: true } : r))
    try {
      await Promise.all(row.cohorts.map(c => api.post(`/curriculum/${c.unitId}/trainers/`, { trainer_id: trainerId })))
      setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, currentTrainerId: trainerId, currentTrainerName: trainerName, saving: false } : r))
    } catch { setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, saving: false } : r)) }
  }

  async function unassignCombined(row: CombinedRow) {
    if (!row.currentTrainerId) return
    setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, saving: true } : r))
    try {
      await Promise.all(row.cohorts.map(c => api.delete(`/curriculum/${c.unitId}/trainers/`, { data: { trainer_id: row.currentTrainerId } })))
      setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, currentTrainerId: null, currentTrainerName: null, saving: false } : r))
    } catch { setCombinedRows(prev => prev.map(r => r.unitName === row.unitName ? { ...r, saving: false } : r)) }
  }

  async function assignUnit(sec: CohortSection, unit: UnitRow, trainerId: string) {
    const trainer = trainers.find(t => t.id === trainerId)
    const trainerName = trainer?.short_name ?? trainer?.full_name ?? null
    setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
      ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, saving: true } : u)
    }))
    try {
      await api.post(`/curriculum/${unit.unitId}/trainers/`, { trainer_id: trainerId })
      setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
        ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, currentTrainerId: trainerId, currentTrainerName: trainerName, saving: false } : u)
      }))
    } catch { setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
      ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, saving: false } : u)
    })) }
  }

  async function unassignUnit(sec: CohortSection, unit: UnitRow) {
    if (!unit.currentTrainerId) return
    setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
      ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, saving: true } : u)
    }))
    try {
      await api.delete(`/curriculum/${unit.unitId}/trainers/`, { data: { trainer_id: unit.currentTrainerId } })
      setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
        ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, currentTrainerId: null, currentTrainerName: null, saving: false } : u)
      }))
    } catch { setCohortSections(prev => prev.map(s => s.cohortId !== sec.cohortId ? s : {
      ...s, units: s.units.map(u => u.unitId === unit.unitId ? { ...u, saving: false } : u)
    })) }
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  const allUnits   = [...combinedRows, ...cohortSections.flatMap(s => s.units)]
  const total      = allUnits.length
  const assigned   = allUnits.filter(u => u.currentTrainerId).length
  const pct        = total ? Math.round((assigned / total) * 100) : 0

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm">Loading units on offer…</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
      <AlertCircle size={24} />
      <p className="text-sm">{error}</p>
      <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 underline">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Units on Offer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign trainers to each cohort's current term units.{' '}
            <span className="text-violet-600 font-medium">Combined</span> units share one trainer across cohorts.{' '}
            <span className="text-orange-500 font-medium">Outsourced</span> units require an external trainer.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Active term pill */}
      {activeTerm && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <BookOpen size={15} className="text-slate-400 shrink-0" />
          <span>Showing units for cohorts in their <strong>current term</strong> as of <strong>{activeTerm.name}</strong></span>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="text-sm font-medium text-slate-700">Assignment progress</span>
          <span className={`text-sm font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {assigned} / {total} assigned ({pct}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Combined units section ── */}
      {combinedRows.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-violet-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Combined Units</h2>
            <span className="text-xs text-slate-400">— one trainer covers all cohorts in this group</span>
            <span className="ml-auto text-xs text-slate-400">{combinedRows.filter(r => r.currentTrainerId).length}/{combinedRows.length} assigned</span>
          </div>
          <div className="bg-white border border-violet-200 rounded-xl overflow-hidden divide-y divide-violet-50">
            {combinedRows.map(row => (
              <div key={row.unitName} className="px-4 py-3 hover:bg-violet-50/40 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.currentTrainerId
                        ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        : <AlertCircle size={13} className="text-amber-400 shrink-0" />}
                      <span className="text-sm font-medium text-slate-800">{row.unitName}</span>
                      {row.isOutsourced && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">Outsourced</span>
                      )}
                    </div>
                    {/* Cohort breakdown */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5 pl-5">
                      {row.cohorts.map(c => (
                        <span key={c.cohortId} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                          {c.cohortName} · {c.unitCode}
                        </span>
                      ))}
                    </div>
                  </div>
                  <TrainerSelect
                    trainers={trainers}
                    value={row.currentTrainerId}
                    saving={row.saving}
                    onChange={tid => assignCombined(row, tid)}
                    onUnassign={() => unassignCombined(row)}
                  />
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
        const secPct      = secTotal ? Math.round((secAssigned / secTotal) * 100) : 0

        return (
          <section key={sec.cohortId}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Users size={16} className="text-blue-500 shrink-0" />
              <h2 className="text-sm font-bold text-slate-800">{sec.cohortName}</h2>
              <span className="text-xs text-slate-400 shrink-0">{sec.programme}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium shrink-0">
                Term {sec.currentTerm}
              </span>
              <span className={`ml-auto text-xs font-medium shrink-0 ${secPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {secAssigned}/{secTotal} assigned
              </span>
            </div>

            {/* Units table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {sec.units.map(unit => (
                <div key={unit.unitId} className="px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {unit.currentTrainerId
                          ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          : <AlertCircle size={13} className="text-amber-400 shrink-0" />}
                        <span className="text-sm font-medium text-slate-800 truncate">{unit.unitName}</span>
                        <span className="text-xs text-slate-400 shrink-0 font-mono">{unit.unitCode}</span>
                        {unit.isOutsourced && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 shrink-0">Outsourced</span>
                        )}
                      </div>
                    </div>
                    <TrainerSelect
                      trainers={trainers}
                      value={unit.currentTrainerId}
                      saving={unit.saving}
                      onChange={tid => assignUnit(sec, unit, tid)}
                      onUnassign={() => unassignUnit(sec, unit)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No units on offer for the current term.</p>
          <p className="text-xs mt-1">Make sure cohorts have a current term set and curriculum units are defined.</p>
        </div>
      )}
    </div>
  )
}