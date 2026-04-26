'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys, DAY_LABELS } from '@/types'
import type { ScheduledUnit, Trainer, Room, Period, DayCode } from '@/types'
import { updateEntry, deleteEntry } from '@/services/timetable'
import { toast } from 'sonner'
import { X, Loader2, Trash2 } from 'lucide-react'

interface Props {
  entry: ScheduledUnit | null
  trainers: Trainer[]
  rooms: Room[]
  periods: Period[]
  onClose: () => void
}

const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

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
      setTrainerId(entry.trainer)
      setRoomId(entry.room)
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
    mutationFn: () => updateEntry(entry!.id, { trainer_id: trainerId, room_id: roomId, period_id: periodId, day, notes }),
    onSuccess: (res) => {
      if (res.ok) { toast.success('Entry updated'); invalidate(); onClose() }
      else toast.error(res.error ?? 'Update failed')
    },
    onError: () => toast.error('Network error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntry(entry!.id),
    onSuccess: (res) => {
      if (res.ok) { toast.success('Entry deleted'); invalidate(); onClose() }
      else toast.error(res.error ?? 'Delete failed')
    },
    onError: () => toast.error('Network error'),
  })

  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs text-gray-500">{entry.unit_code}</p>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{entry.unit_name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{entry.cohort_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 space-y-4">

          {/* Day */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
            <select
              value={day}
              onChange={e => setDay(e.target.value as DayCode)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              {DAYS.map(d => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              {periods.filter(p => !p.is_break).map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.start_time.slice(0,5)}–{p.end_time.slice(0,5)})
                </option>
              ))}
            </select>
          </div>

          {/* Trainer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Trainer</label>
            <select
              value={trainerId}
              onChange={e => setTrainerId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              {trainers.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Room</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              {rooms.filter(r => r.is_active).map(r => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name} (cap {r.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 transition-colors"
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
