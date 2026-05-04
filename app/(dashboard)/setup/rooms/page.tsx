'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRooms } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Room, RoomType } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { DoorOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'CLASSROOM', label: 'Classroom'      },
  { value: 'LAB',       label: 'Laboratory'     },
  { value: 'COMPUTER',  label: 'Computer Lab'   },
  { value: 'CLINICAL',  label: 'Clinical Lab'   },
  { value: 'WORKSHOP',  label: 'Workshop'       },
  { value: 'SEMINAR',   label: 'Seminar Room'   },
  { value: 'HALL',      label: 'Lecture Hall'   },
  { value: 'ONLINE',    label: 'Online/Virtual' },
  { value: 'OTHER',     label: 'Other'          },
]

const ROOM_TYPE_COLOURS: Record<string, string> = {
  CLASSROOM: 'bg-blue-50 text-blue-700 ring-blue-200',
  LAB:       'bg-purple-50 text-purple-700 ring-purple-200',
  COMPUTER:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CLINICAL:  'bg-pink-50 text-pink-700 ring-pink-200',
  WORKSHOP:  'bg-orange-50 text-orange-700 ring-orange-200',
  SEMINAR:   'bg-teal-50 text-teal-700 ring-teal-200',
  HALL:      'bg-yellow-50 text-yellow-700 ring-yellow-200',
  ONLINE:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  OTHER:     'bg-gray-50 text-gray-600 ring-gray-200',
}

const BLANK = {
  code:      '',
  name:      '',
  capacity:  30,
  room_type: 'CLASSROOM' as RoomType,
  building:  '',
  floor:     0,
  features:  '',
  is_active: true,
}

type RoomForm = typeof BLANK

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const qc = useQueryClient()
  const { data: rooms = [], isLoading } = useRooms()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form,    setForm]    = useState<RoomForm>({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setOpen(true)
  }

  function openEdit(r: Room) {
    setEditing(r)
    setForm({
      code:      r.code      ?? '',
      name:      r.name      ?? '',
      capacity:  r.capacity  ?? 30,
      room_type: r.room_type ?? 'CLASSROOM',
      building:  r.building  ?? '',
      floor:     r.floor     ?? 0,
      features:  Array.isArray(r.features) ? r.features.join(', ') : '',
      is_active: r.is_active ?? true,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm({ ...BLANK })
  }

  function set<K extends keyof RoomForm>(key: K, val: RoomForm[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.rooms })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        features: form.features.split(',').map(s => s.trim()).filter(Boolean),
      }
      return editing
        ? api.put(`/rooms/${editing.id}/`, payload).then(r => r.data)
        : api.post('/rooms/', payload).then(r => r.data)
    },
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Room updated' : 'Room created')
        invalidate()
        closeModal()
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error — could not save room'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}/`).then(r => r.data),
    onSuccess: (res, id) => {
      if (res.ok) {
        toast.success('Room deleted')
        invalidate()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      if (delId === id) setDelId(null)
    },
    onError: () => {
      toast.error('Network error — could not delete room')
      setDelId(null)
    },
  })

  function handleDelete(r: Room) {
    if (!confirm(`Delete room "${r.name}"? This cannot be undone.`)) return
    setDelId(r.id)
    delMutation.mutate(r.id)
  }

  const isValid =
    form.code.trim().length > 0 &&
    form.name.trim().length > 0 &&
    form.capacity >= 1

  const sorted = [...rooms].sort((a, b) =>
    (a.building ?? '').localeCompare(b.building ?? '') ||
    (a.code ?? '').localeCompare(b.code ?? '')
  )

  return (
    <SetupShell
      title="Rooms"
      subtitle={`${rooms.length} room${rooms.length !== 1 ? 's' : ''} configured`}
      onAdd={openCreate}
      addLabel="Add room"
    >
      <SetupTable
        loading={isLoading}
        rows={sorted}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<DoorOpen className="h-10 w-10" />}
        emptyMsg="No rooms configured yet"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: 'Code',
            width: '90px',
            render: r => (
              <code className="text-xs bg-gray-50 ring-1 ring-gray-200 rounded-lg px-2 py-0.5 font-mono text-gray-700">
                {r.code ?? '—'}
              </code>
            ),
          },
          {
            header: 'Name',
            render: r => (
              <div>
                <span className="font-semibold text-gray-800">{r.name ?? '—'}</span>
                {r.building && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {r.building}{r.floor != null ? `, Floor ${r.floor}` : ''}
                  </span>
                )}
              </div>
            ),
          },
          {
            header: 'Type',
            render: r => (
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                ROOM_TYPE_COLOURS[r.room_type] ?? 'bg-gray-50 text-gray-600 ring-gray-200'
              )}>
                {ROOM_TYPES.find(t => t.value === r.room_type)?.label ?? r.room_type ?? '—'}
              </span>
            ),
          },
          {
            header: 'Cap.',
            width: '70px',
            render: r => (
              <span className="text-sm text-gray-700 font-mono tabular-nums">
                {r.capacity ?? '—'}
              </span>
            ),
          },
          {
            header: 'Features',
            render: r => {
              const features = Array.isArray(r.features) ? r.features : []
              if (features.length === 0) return <span className="text-gray-400 text-xs">—</span>
              return (
                <div className="flex flex-wrap gap-1">
                  {features.slice(0, 3).map(f => (
                    <span key={f} className="text-xs bg-slate-50 text-slate-600 ring-1 ring-slate-200 rounded-lg px-1.5 py-0.5">
                      {f}
                    </span>
                  ))}
                  {features.length > 3 && (
                    <span className="text-xs text-gray-400 self-center">+{features.length - 3}</span>
                  )}
                </div>
              )
            },
          },
          {
            header: 'Active',
            width: '64px',
            render: r => (
              <span className={cn(
                'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-offset-1',
                r.is_active
                  ? 'bg-emerald-500 ring-emerald-200'
                  : 'bg-gray-300 ring-gray-100'
              )} />
            ),
          },
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Room' : 'Add Room'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        {/* Code + Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. LH-01"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Capacity <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={e => set('capacity', Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Lecture Hall A"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Room type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Type
          </label>
          <select
            value={form.room_type}
            onChange={e => set('room_type', e.target.value as RoomType)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors bg-white"
          >
            {ROOM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Building + Floor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Building
            </label>
            <input
              value={form.building}
              onChange={e => set('building', e.target.value)}
              placeholder="e.g. Block A"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Floor
            </label>
            <input
              type="number"
              value={form.floor}
              onChange={e => set('floor', Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Features
            <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(comma-separated)</span>
          </label>
          <input
            value={form.features}
            onChange={e => set('features', e.target.value)}
            placeholder="projector, whiteboard, aircon"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Used by the scheduler to match room requirements.
          </p>
        </div>

        {/* Active toggle */}
        <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => set('is_active', !form.is_active)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-1',
              form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_active ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <div>
            <span className="text-sm text-gray-800 font-semibold">Active</span>
            <p className="text-xs text-gray-400 mt-0.5">Inactive rooms are hidden from the scheduler.</p>
          </div>
        </div>
      </SetupModal>
    </SetupShell>
  )
}