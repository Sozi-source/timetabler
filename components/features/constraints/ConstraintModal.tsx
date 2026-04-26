'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import type { Constraint } from '@/types'
import { createConstraint, updateConstraint } from '@/services/setup'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'
import api from '@/lib/api'

const DAYS = [
  { value: 'MON', label: 'Mon' },
  { value: 'TUE', label: 'Tue' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Thu' },
  { value: 'FRI', label: 'Fri' },
]

interface Props {
  constraint: Constraint | null
  open: boolean
  onClose: () => void
}

type AnyUnit   = { id: string; code: string; name: string }
type AnyProg   = { id: string }
type AnyPeriod = { id: string; label: string; start: string }

function unwrap<T>(raw: unknown): T[] {
  if (!raw) return []
  const d = (raw as { data?: unknown }).data
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object' && 'results' in (d as object))
    return (d as { results: T[] }).results
  if (Array.isArray(raw)) return raw as T[]
  return []
}

export default function ConstraintModal({ constraint, open, onClose }: Props) {
  const qc     = useQueryClient()
  const isEdit = !!constraint

  const [name,      setName]      = useState('')
  const [unitId,    setUnitId]    = useState('')
  const [day,       setDay]       = useState('')
  const [periodId,  setPeriodId]  = useState('')
  const [isActive,  setIsActive]  = useState(true)
  const [roomId,    setRoomId]    = useState('')

  // Fetch programmes then curriculum units
  const { data: progsRaw } = useQuery({
    queryKey: queryKeys.programmes,
    queryFn:  () => api.get('/programmes/').then(r => r.data),
    enabled:  open,
  })
  const progs = unwrap<AnyProg>(progsRaw)

  const { data: allUnitsRaw } = useQuery({
    queryKey: ['curriculum', 'all', progs.map(p => p.id).join(',')],
    queryFn:  () => Promise.all(
      progs.map(p => api.get('/curriculum/?programme=' + p.id).then(r => r.data))
    ),
    enabled: open && progs.length > 0,
  })
  const units: AnyUnit[] = allUnitsRaw
    ? (allUnitsRaw as unknown[]).flatMap(r => unwrap<AnyUnit>(r))
    : []

  // Fetch periods
  const { data: periodsRaw } = useQuery({
    queryKey: queryKeys.periods,
    queryFn:  () => api.get('/periods/').then(r => r.data),
    enabled:  open,
  })
  const periods = unwrap<AnyPeriod>(periodsRaw)

  // Fetch rooms
  const { data: roomsRaw } = useQuery({
    queryKey: queryKeys.rooms,
    queryFn:  () => api.get('/rooms/').then(r => r.data),
    enabled:  open,
  })
  const rooms = unwrap<{ id: string; name: string; code: string }>(roomsRaw)

  // Populate when editing
  useEffect(() => {
    if (!open) return
    if (constraint) {
      const c = constraint as unknown as {
        name: string
        is_active: boolean
        curriculum_unit?: string
        parameters?: { day?: string; period_id?: string; preferred_room?: string }
      }
      setName(c.name)
      setUnitId(c.curriculum_unit ?? '')
      setDay(c.parameters?.day ?? '')
      setPeriodId(c.parameters?.period_id ?? '')
      setRoomId(c.parameters?.preferred_room ?? '')
      setIsActive(c.is_active)
    } else {
      setName(''); setUnitId(''); setDay(''); setPeriodId(''); setIsActive(true); setRoomId('')
    }
  }, [open, constraint])

  const valid = name.trim() && unitId && day && periodId

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        scope:           'UNIT',
        rule:            'PIN_DAY_PERIOD',
        is_hard:         true,
        is_active:       isActive,
        curriculum_unit: unitId,
        parameters:      { day, period_id: periodId, ...(roomId ? { preferred_room: roomId } : {}) },
      }
      return isEdit
        ? updateConstraint(constraint!.id, payload)
        : createConstraint(payload)
    },
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(isEdit ? 'Constraint updated' : 'Constraint saved')
        qc.invalidateQueries({ queryKey: queryKeys.constraints })
        onClose()
      } else {
        toast.error((res as { error?: string }).error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error'),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Unit Constraint' : 'Fix Unit to Day & Session'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              The scheduler will always place this unit on the chosen day and session
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Label
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Anatomy — Monday morning"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Curriculum Unit
            </label>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            >
              <option value="">{units.length === 0 ? 'Loading units…' : 'Select unit…'}</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Day
            </label>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDay(d.value)}
                  className={[
                    'flex-1 rounded-lg border py-2 text-xs font-semibold transition-all',
                    day === d.value
                      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Session
            </label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            >
              <option value="">{periods.length === 0 ? 'Loading sessions…' : 'Select session…'}</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.label} ({p.start})</option>
              ))}
            </select>
          </div>

          {/* Preferred Room (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Preferred Room <span className="text-gray-300 font-normal normal-case">(optional)</span>
            </label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            >
              <option value="">Any available room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Scheduler will prefer this venue when placing the unit</p>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <div
              onClick={() => setIsActive(v => !v)}
              className={[
                'relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0',
                isActive ? 'bg-[#1e3a5f]' : 'bg-gray-300',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')} />
            </div>
            <span className="text-sm text-gray-700">Active</span>
            <span className="text-xs text-gray-400">
              {isActive ? 'Applied on next generate' : 'Ignored by scheduler'}
            </span>
          </label>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !valid}
            className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Save constraint'}
          </button>
        </div>

      </div>
    </div>
  )
}
