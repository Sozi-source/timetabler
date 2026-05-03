'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Search, Users, BookOpen, Loader2, ChevronDown, RefreshCw, X } from 'lucide-react'
import api from '@/lib/api'

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
}

interface Programme {
  id: string
  code: string
  name: string
  sharing_group: string
}

interface UnitEntry {
  cohortId: string
  cohortName: string
  unitId: string
  unitCode: string
}

interface UnitRow {
  name: string
  entries: UnitEntry[]
  isShared: boolean
  isOutsourced: boolean
  currentTrainerId: string | null
  currentTrainerName: string | null
  saving: boolean
}

interface CohortSection {
  cohortId: string
  cohortName: string
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

// ─── TrainerSelect ────────────────────────────────────────────────────────────

function TrainerSelect({
  trainers, value, saving, onChange, onUnassign,
}: {
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
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-56 justify-between border transition-colors',
          value
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
          saving ? 'opacity-60 cursor-wait' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="truncate">
          {saving ? 'Saving…' : (selected?.short_name ?? 'Assign trainer…')}
        </span>
        {saving
          ? <Loader2 size={14} className="animate-spin shrink-0" />
          : <ChevronDown size={14} className="shrink-0 opacity-50" />}
      </button>

      {/* Unassign button — only shown when a trainer is assigned */}
      {value && !saving && (
        <button
          onClick={() => { onUnassign(); close() }}
          title="Remove trainer assignment"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 z-20 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden" style={{ top: '100%' }}>
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                <Search size={13} className="text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search trainers…"
                  className="text-sm bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-400 text-center">No trainers found</li>
              )}
              {filtered.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => { onChange(t.id); close() }}
                    className={[
                      'w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 flex items-baseline gap-2',
                      t.id === value ? 'text-emerald-700 font-medium' : 'text-slate-700',
                    ].join(' ')}
                  >
                    <span>{t.short_name}</span>
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

// ─── UnitRowItem ──────────────────────────────────────────────────────────────

function UnitRowItem({
  row, trainers, onAssign, onUnassign, subtitle,
}: {
  row: UnitRow
  trainers: Trainer[]
  onAssign: (trainerId: string) => void
  onUnassign: () => void
  subtitle?: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 flex-wrap">
          {row.currentTrainerId
            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : <AlertCircle size={14} className="text-amber-400 shrink-0" />}
          <span className="text-sm font-medium text-slate-800 truncate">{row.name}</span>
          {!row.isShared && (
            <span className="text-xs text-slate-400 shrink-0">{row.entries[0]?.unitCode}</span>
          )}
          {row.isOutsourced && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
              Outsourced
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-violet-500 mt-0.5 pl-5">{subtitle}</p>
        )}
      </div>
      <TrainerSelect
        trainers={trainers}
        value={row.currentTrainerId}
        saving={row.saving}
        onChange={onAssign}
        onUnassign={onUnassign}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnitsOnOfferPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [sharedRows, setSharedRows] = useState<UnitRow[]>([])
  const [cohortSections, setCohortSections] = useState<CohortSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const nameToEntries = new Map<string, {
        cohortId: string
        cohortName: string
        unitId: string
        unitCode: string
        trainerId: string | null
        trainerName: string | null
        isOutsourced: boolean
      }[]>()

      cohortUnits.forEach(({ cohort, units }) => {
        const sg = sharingGroupMap.get(cohort.programme_id) ?? ''
        units.forEach(u => {
          const key = `${sg}::${u.name.trim()}`
          if (!nameToEntries.has(key)) nameToEntries.set(key, [])
          const qt = u.qualified_trainers?.[0] ?? null
          nameToEntries.get(key)!.push({
            cohortId: cohort.id,
            cohortName: cohort.name,
            unitId: u.id,
            unitCode: u.code,
            trainerId: qt?.id ?? null,
            trainerName: qt?.name ?? null,
            isOutsourced: u.is_outsourced,
          })
        })
      })

      const shared: UnitRow[] = []
      const uniqueByCohort = new Map<string, { cohortName: string; rows: UnitRow[] }>()
      cohortUnits.forEach(({ cohort }) => {
        uniqueByCohort.set(cohort.id, { cohortName: cohort.name, rows: [] })
      })

      nameToEntries.forEach((entries, key) => {
        const unitName = key.split('::').slice(1).join('::')
        const isOutsourced = entries[0].isOutsourced

        if (entries.length >= 2) {
          shared.push({
            name: unitName,
            entries: entries.map(e => ({
              cohortId: e.cohortId,
              cohortName: e.cohortName,
              unitId: e.unitId,
              unitCode: e.unitCode,
            })),
            isShared: true,
            isOutsourced,
            currentTrainerId: entries[0].trainerId,
            currentTrainerName: entries[0].trainerName,
            saving: false,
          })
        } else {
          const e = entries[0]
          uniqueByCohort.get(e.cohortId)?.rows.push({
            name: unitName,
            entries: [{ cohortId: e.cohortId, cohortName: e.cohortName, unitId: e.unitId, unitCode: e.unitCode }],
            isShared: false,
            isOutsourced: e.isOutsourced,
            currentTrainerId: e.trainerId,
            currentTrainerName: e.trainerName,
            saving: false,
          })
        }
      })

      setSharedRows(shared)
      setCohortSections(
        Array.from(uniqueByCohort.entries())
          .filter(([, v]) => v.rows.length > 0)
          .map(([cohortId, v]) => ({ cohortId, cohortName: v.cohortName, units: v.rows }))
      )
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Assign trainer ────────────────────────────────────────────────────────

  async function assignTrainer(
    unitIds: string[], trainerId: string, isShared: boolean, rowName: string
  ) {
    const trainer = trainers.find(t => t.id === trainerId)
    const trainerName = trainer?.short_name ?? trainer?.full_name ?? null

    const setSaving = (v: boolean) => {
      if (isShared) {
        setSharedRows(prev => prev.map(r => r.name === rowName ? { ...r, saving: v } : r))
      } else {
        setCohortSections(prev => prev.map(sec => ({
          ...sec,
          units: sec.units.map(u => u.name === rowName ? { ...u, saving: v } : u),
        })))
      }
    }

    setSaving(true)
    try {
      await Promise.all(
        unitIds.map(uid =>
          api.post(`/curriculum/${uid}/trainers/`, { trainer_id: trainerId })
        )
      )
      if (isShared) {
        setSharedRows(prev => prev.map(r =>
          r.name === rowName
            ? { ...r, currentTrainerId: trainerId, currentTrainerName: trainerName, saving: false }
            : r
        ))
      } else {
        setCohortSections(prev => prev.map(sec => ({
          ...sec,
          units: sec.units.map(u =>
            u.name === rowName
              ? { ...u, currentTrainerId: trainerId, currentTrainerName: trainerName, saving: false }
              : u
          ),
        })))
      }
    } catch {
      setSaving(false)
      alert('Failed to assign trainer. Please try again.')
    }
  }

  // ── Unassign trainer ──────────────────────────────────────────────────────

  async function unassignTrainer(
    unitIds: string[], currentTrainerId: string, isShared: boolean, rowName: string
  ) {
    const setSaving = (v: boolean) => {
      if (isShared) {
        setSharedRows(prev => prev.map(r => r.name === rowName ? { ...r, saving: v } : r))
      } else {
        setCohortSections(prev => prev.map(sec => ({
          ...sec,
          units: sec.units.map(u => u.name === rowName ? { ...u, saving: v } : u),
        })))
      }
    }

    setSaving(true)
    try {
      await Promise.all(
        unitIds.map(uid =>
          api.delete(`/curriculum/${uid}/trainers/`, { data: { trainer_id: currentTrainerId } })
        )
      )
      if (isShared) {
        setSharedRows(prev => prev.map(r =>
          r.name === rowName
            ? { ...r, currentTrainerId: null, currentTrainerName: null, saving: false }
            : r
        ))
      } else {
        setCohortSections(prev => prev.map(sec => ({
          ...sec,
          units: sec.units.map(u =>
            u.name === rowName
              ? { ...u, currentTrainerId: null, currentTrainerName: null, saving: false }
              : u
          ),
        })))
      }
    } catch {
      setSaving(false)
      alert('Failed to remove trainer. Please try again.')
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  const allRows = [...sharedRows, ...cohortSections.flatMap(s => s.units)]
  const total = allRows.length
  const assigned = allRows.filter(r => r.currentTrainerId).length
  const pct = total ? Math.round((assigned / total) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading units on offer…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
        <AlertCircle size={24} />
        <p className="text-sm">{error}</p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 underline">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Units on Offer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign trainers to active cohort units. Shared units are grouped — one assignment covers all cohorts.{' '}
            <span className="text-orange-500">Outsourced</span> units require a trainer from another department.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Assignment progress</span>
          <span className={`text-sm font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {assigned} / {total} units assigned ({pct}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Shared units */}
      {sharedRows.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Shared Units</h2>
            <span className="text-xs text-slate-400">— one trainer covers all listed cohorts</span>
          </div>
          <div className="bg-white border border-violet-100 rounded-xl overflow-hidden divide-y divide-violet-50">
            {sharedRows.map(row => (
              <UnitRowItem
                key={row.name}
                row={row}
                trainers={trainers}
                subtitle={row.entries.map(e => `${e.cohortName} (${e.unitCode})`).join(' · ')}
                onAssign={tid => assignTrainer(row.entries.map(e => e.unitId), tid, true, row.name)}
                onUnassign={() => row.currentTrainerId && unassignTrainer(row.entries.map(e => e.unitId), row.currentTrainerId, true, row.name)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Per-cohort unique units */}
      {cohortSections.map(sec => (
        <section key={sec.cohortId}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700">{sec.cohortName}</h2>
            <span className="text-xs text-slate-400">
              — {sec.units.filter(u => u.currentTrainerId).length}/{sec.units.length} assigned
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {sec.units.map(row => (
              <UnitRowItem
                key={row.name}
                row={row}
                trainers={trainers}
                onAssign={tid => assignTrainer([row.entries[0].unitId], tid, false, row.name)}
                onUnassign={() => row.currentTrainerId && unassignTrainer([row.entries[0].unitId], row.currentTrainerId, false, row.name)}
              />
            ))}
          </div>
        </section>
      ))}

      {total === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No active cohort units found.</p>
          <p className="text-xs mt-1">Add cohorts and curriculum units first.</p>
        </div>
      )}
    </div>
  )
}