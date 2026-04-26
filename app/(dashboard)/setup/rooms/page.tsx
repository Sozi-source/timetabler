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
  { value: 'CLASSROOM', label: 'Classroom'     },
  { value: 'LAB',       label: 'Laboratory'    },
  { value: 'COMPUTER',  label: 'Computer Lab'  },
  { value: 'CLINICAL',  label: 'Clinical Lab'  },
  { value: 'WORKSHOP',  label: 'Workshop'      },
  { value: 'SEMINAR',   label: 'Seminar Room'  },
  { value: 'HALL',      label: 'Lecture Hall'  },
  { value: 'ONLINE',    label: 'Online/Virtual'},
  { value: 'OTHER',     label: 'Other'         },
]

const ROOM_TYPE_COLOURS: Record<string, string> = {
  CLASSROOM: 'bg-blue-100 text-blue-700',
  LAB:       'bg-purple-100 text-purple-700',
  COMPUTER:  'bg-indigo-100 text-indigo-700',
  CLINICAL:  'bg-pink-100 text-pink-700',
  WORKSHOP:  'bg-orange-100 text-orange-700',
  SEMINAR:   'bg-teal-100 text-teal-700',
  HALL:      'bg-yellow-100 text-yellow-700',
  ONLINE:    'bg-green-100 text-green-700',
  OTHER:     'bg-gray-100 text-gray-600',
}

const BLANK = {
  code:      '',
  name:      '',
  capacity:  30,
  room_type: 'CLASSROOM' as RoomType,
  building:  '',
  floor:     0,
  features:  '',          // comma-separated string in form; array when sent to API
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
        features: form.features
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
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

  const isValid = form.code.trim().length > 0 &&
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
              <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">
                {r.code ?? '—'}
              </code>
            ),
          },
          {
            header: 'Name',
            render: r => (
              <div>
                <span className="font-medium text-gray-900">{r.name ?? '—'}</span>
                {r.building && (
                  <span className="block text-xs text-gray-400">
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
                'rounded-full px-2 py-0.5 text-xs font-medium',
                ROOM_TYPE_COLOURS[r.room_type] ?? 'bg-gray-100 text-gray-600'
              )}>
                {ROOM_TYPES.find(t => t.value === r.room_type)?.label ?? r.room_type ?? '—'}
              </span>
            ),
          },
          {
            header: 'Capacity',
            width: '90px',
            render: r => (
              <span className="text-sm text-gray-700 font-mono">
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
                    <span key={f} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                      {f}
                    </span>
                  ))}
                  {features.length > 3 && (
                    <span className="text-xs text-gray-400">+{features.length - 3}</span>
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
                'inline-block h-2 w-2 rounded-full',
                r.is_active ? 'bg-emerald-500' : 'bg-gray-300'
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Code <span className="text-red-400">*</span>
            </label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. LH-01"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Capacity <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={e => set('capacity', Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Lecture Hall A"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        {/* Room type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select
            value={form.room_type}
            onChange={e => set('room_type', e.target.value as RoomType)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            {ROOM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Building + Floor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Building</label>
            <input
              value={form.building}
              onChange={e => set('building', e.target.value)}
              placeholder="e.g. Block A"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
            <input
              type="number"
              value={form.floor}
              onChange={e => set('floor', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Features
            <span className="text-gray-400 font-normal ml-1">(comma-separated)</span>
          </label>
          <input
            value={form.features}
            onChange={e => set('features', e.target.value)}
            placeholder="projector, whiteboard, aircon"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <p className="text-xs text-gray-400 mt-1">
            Used by the scheduler to match room requirements.
          </p>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => set('is_active', !form.is_active)}
            className={cn(
              'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-1',
              form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_active ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <div>
            <span className="text-sm text-gray-700 font-medium">Active</span>
            <p className="text-xs text-gray-400">Inactive rooms are hidden from the scheduler.</p>
          </div>
        </label>
      </SetupModal>
    </SetupShell>
  )
}