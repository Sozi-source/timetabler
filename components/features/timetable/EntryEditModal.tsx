'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys, DAY_LABELS } from '@/types'
import type { ScheduledUnit, Trainer, Room, Period, DayCode } from '@/types'
import { updateEntry, deleteEntry } from '@/services/timetable'
import { toast } from 'sonner'
import { X, Loader2, Trash2, Calendar, Clock, User, MapPin, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  entry: ScheduledUnit | null
  trainers: Trainer[]
  rooms: Room[]
  periods: Period[]
  onClose: () => void
}

const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const fieldBase =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 ' +
  'transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]'

interface FieldProps {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Field({ label, icon, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
        <span className="text-[#1e3a5f]/50">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function EntryEditModal({ entry, trainers, rooms, periods, onClose }: Props) {
  const { activeTerm } = useTermStore()
  const qc = useQueryClient()

  const [trainerId, setTrainerId] = useState('')
  const [roomId,    setRoomId]    = useState('')
  const [periodId,  setPeriodId]  = useState('')
  const [day,       setDay]       = useState<DayCode>('MON')
  const [notes,     setNotes]     = useState('')

  useEffect(() => {
    if (entry) {
      setTrainerId(entry.trainer ?? '')
      setRoomId(entry.room ?? '')
      setPeriodId(entry.period)
      setDay(entry.day)
      setNotes(entry.notes ?? '')
    }
  }, [entry])

  const invalidate = () => {
    if (activeTerm) {
      qc.invalidateQueries({ queryKey: queryKeys.masterTT(activeTerm.id) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard })
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updateEntry(entry!.id, { trainer: trainerId, room: roomId, period: periodId, day, notes }),
    onSuccess: () => { toast.success('Entry updated'); invalidate(); onClose() },
    onError:   () => toast.error('Network error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntry(entry!.id),
    onSuccess: () => { toast.success('Entry deleted'); invalidate(); onClose() },
    onError:   () => toast.error('Network error'),
  })

  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[92svh] flex flex-col overflow-hidden">

        {/* Mobile drag handle */}
        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="min-w-0 pr-3">
            <p className="text-[10px] font-bold text-[#1e3a5f]/50 uppercase tracking-widest font-mono">
              {entry.unit_code}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-gray-900 leading-tight truncate">
              {entry.unit_name}
            </h2>
            <span className="inline-flex mt-1 items-center rounded-full bg-[#1e3a5f]/8 border border-[#1e3a5f]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1e3a5f]">
              {entry.cohort_name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Day */}
          <Field label="Day" icon={<Calendar className="h-3 w-3" />}>
            <select
              value={day}
              onChange={e => setDay(e.target.value as DayCode)}
              className={fieldBase}
            >
              {DAYS.map(d => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </Field>

          {/* Period */}
          <Field label="Period" icon={<Clock className="h-3 w-3" />}>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className={fieldBase}
            >
              {periods.filter(p => !p.is_break).map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </Field>

          {/* Trainer */}
          <Field label="Trainer" icon={<User className="h-3 w-3" />}>
            <select
              value={trainerId}
              onChange={e => setTrainerId(e.target.value)}
              className={fieldBase}
            >
              {trainers.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </Field>

          {/* Room */}
          <Field label="Room" icon={<MapPin className="h-3 w-3" />}>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className={fieldBase}
            >
              {rooms.filter(r => r.is_active).map(r => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name} (cap {r.capacity})
                </option>
              ))}
            </select>
          </Field>

          {/* Notes */}
          <Field label="Notes" icon={<FileText className="h-3 w-3" />}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              className={cn(fieldBase, 'resize-none')}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4 shrink-0">
          {/* Delete */}
          <button
            onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors active:scale-[.97]"
          >
            {deleteMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Trash2 className="h-4 w-4" />}
            Delete
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors active:scale-[.97]"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-[#1e3a5f]/20 hover:bg-[#162d4a] disabled:opacity-60 transition-colors active:scale-[.97] disabled:active:scale-100"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}