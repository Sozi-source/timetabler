'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { useTermStore } from '@/store'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledUnit {
  id: string
  cohort: { id: string; name: string }
  curriculum_unit: { id: string; code: string; name: string }
  trainer: { id: string; first_name: string; last_name: string } | null
  room: { id: string; name: string; code: string } | null
  day: string
  period: { id: string; label: string }
  status: 'DRAFT' | 'PUBLISHED'
  notes?: string
}

interface Trainer {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  is_active: boolean
}

interface Room {
  id: string
  name: string
  code: string
  room_type: string
  capacity: number
  is_active: boolean
}

interface Period {
  id: string
  label: string
  order: number
  is_break: boolean
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday'
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; sub?: string }[]
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors text-gray-800"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}{o.sub ? ` — ${o.sub}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function TimetableEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const activeTerm = useTermStore(s => s.activeTerm)
  const termId = activeTerm?.id ?? ''

  const [day, setDay] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [notes, setNotes] = useState('')
  const [dirty, setDirty] = useState(false)

  // Fetch current entry
  const { data: entry, isLoading } = useQuery({
    queryKey: ['timetable-entry', id],
    queryFn: () => api.get(`/timetable/entry/${id}/`).then(r => r.data.data as ScheduledUnit),
    enabled: !!id,
  })

  // Fetch trainers
  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => api.get('/trainers/').then(r => r.data.data as Trainer[]),
  })

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms/').then(r => r.data.data as Room[]),
  })

  // Fetch periods
  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => api.get('/periods/').then(r => (r.data.data as Period[]).filter(p => !p.is_break)),
  })

  // Populate form when entry loads
  useEffect(() => {
    if (!entry) return
    setDay(entry.day)
    setPeriodId(entry.period.id)
    setTrainerId(entry.trainer?.id ?? '')
    setRoomId(entry.room?.id ?? '')
    setNotes(entry.notes ?? '')
  }, [entry])

  const track = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setDirty(true)
  }

  // Save mutation
  const save = useMutation({
    mutationFn: () =>
      api.put(`/timetable/entry/${id}/`, {
        day: day || undefined,
        period_id: periodId || undefined,
        trainer_id: trainerId || undefined,
        room_id: roomId || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Entry updated')
      qc.invalidateQueries({ queryKey: ['timetable-entry', id] })
      qc.invalidateQueries({ queryKey: ['timetable', termId] })
      setDirty(false)
      router.push(`/timetable/${id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Update failed'),
  })

  // Delete mutation
  const remove = useMutation({
    mutationFn: () => api.delete(`/timetable/entry/${id}/`),
    onSuccess: () => {
      toast.success('Entry deleted')
      qc.invalidateQueries({ queryKey: ['timetable', termId] })
      router.push('/timetable')
    },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <p className="text-lg font-medium">Entry not found</p>
        <button onClick={() => router.push('/timetable')} className="text-sm text-[#1e3a5f] hover:underline">
          Back to Timetable
        </button>
      </div>
    )
  }

  const trainerOptions = trainers
    .filter(t => t.is_active)
    .map(t => ({ value: t.id, label: `${t.first_name} ${t.last_name}`, sub: t.staff_id }))

  const roomOptions = rooms
    .filter(r => r.is_active)
    .map(r => ({ value: r.id, label: `${r.name} (${r.code})`, sub: `${r.room_type} · Cap ${r.capacity}` }))

  const periodOptions = periods
    .sort((a, b) => a.order - b.order)
    .map(p => ({ value: p.id, label: p.label }))

  const dayOptions = DAYS.map(d => ({ value: d, label: DAY_LABELS[d] }))

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/timetable/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Entry
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this entry?')) remove.mutate()
          }}
          disabled={remove.isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {/* Published warning */}
      {entry.status === 'PUBLISHED' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            This entry is <strong>published</strong>. Editing it will affect the active timetable.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-6 py-4">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-0.5">Editing</p>
          <h1 className="text-white text-lg font-bold">
            {entry.curriculum_unit.code} · {entry.cohort.name}
          </h1>
          <p className="text-blue-200 text-sm mt-0.5">{entry.curriculum_unit.name}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Day"
              value={day}
              onChange={track(setDay)}
              options={dayOptions}
            />
            <SelectField
              label="Period"
              value={periodId}
              onChange={track(setPeriodId)}
              options={periodOptions}
            />
          </div>

          <SelectField
            label="Trainer"
            value={trainerId}
            onChange={track(setTrainerId)}
            options={trainerOptions}
            placeholder="Unassigned"
          />

          <SelectField
            label="Room"
            value={roomId}
            onChange={track(setRoomId)}
            options={roomOptions}
            placeholder="Unassigned"
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => track(setNotes)(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors resize-none text-gray-800"
            />
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !dirty}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              dirty
                ? 'bg-[#1e3a5f] text-white hover:bg-[#162d4a]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}