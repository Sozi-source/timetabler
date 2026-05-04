'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTrainers } from '@/hooks/useSetup'
import api from '@/lib/api'
import { toast } from 'sonner'
import { X, Search, Check, Loader2, Users } from 'lucide-react'

type AssignedTrainer = { id: string; name: string; trainer_type: string; label: string }
type Trainer = { id: string; first_name: string; last_name: string; short_name?: string; staff_id: string; department?: string | { name: string } }

interface Props { unitId: string; unitName: string; onClose: () => void }

export default function TrainerPanel({ unitId, unitName, onClose }: Props) {
  const qc = useQueryClient()
  const { data: allTrainers = [] } = useTrainers()
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const key = ['curriculum', unitId, 'trainers']

  const { data: assigned = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api.get(`/curriculum/${unitId}/trainers/`).then(r => {
      const d = r.data
      if (Array.isArray(d?.data)) return d.data
      if (Array.isArray(d)) return d
      return []
    }),
  })

  const assignedIds = new Set((assigned as AssignedTrainer[]).map(t => t.id))

  const addMutation = useMutation({
    mutationFn: (trainer: Trainer) =>
      api.post(`/curriculum/${unitId}/trainers/`, { trainer_id: trainer.id, trainer_type: 'INTERNAL', label: '' }).then(r => r.data),
    onSuccess: (res) => {
      setSaving(null)
      if (res.ok) qc.invalidateQueries({ queryKey: key })
      else toast.error(res.error ?? 'Failed')
    },
    onError: () => { setSaving(null); toast.error('Network error') },
  })

  const removeMutation = useMutation({
    mutationFn: (trainerId: string) =>
      api.delete(`/curriculum/${unitId}/trainers/`, { data: { trainer_id: trainerId } }).then(r => r.data),
    onSuccess: (res) => {
      setSaving(null)
      if (res.ok) qc.invalidateQueries({ queryKey: key })
      else toast.error(res.error ?? 'Failed')
    },
    onError: () => { setSaving(null); toast.error('Network error') },
  })

  function toggle(trainer: Trainer) {
    setSaving(trainer.id)
    if (assignedIds.has(trainer.id)) removeMutation.mutate(trainer.id)
    else addMutation.mutate(trainer)
  }

  const filtered = (allTrainers as Trainer[]).filter(t => {
    const name = t.short_name ?? `${t.first_name} ${t.last_name}`
    const dept = typeof t.department === 'object' ? t.department?.name : t.department ?? ''
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      t.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
      dept.toLowerCase().includes(search.toLowerCase())
    )
  })

  const assignedList = assigned as AssignedTrainer[]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-base font-bold text-gray-900">Qualified Trainers</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{unitName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Assigned strip */}
        <div className="px-6 py-3 bg-[#1e3a5f]/4 border-b border-[#1e3a5f]/10 shrink-0 min-h-[52px]">
          {isLoading ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </p>
          ) : assignedList.length === 0 ? (
            <p className="text-xs text-gray-400">No trainers assigned — tick trainers below</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {assignedList.map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e3a5f] text-white text-xs px-2.5 py-1 font-medium ring-1 ring-[#1e3a5f]/20 shadow-sm"
                >
                  <Check className="h-3 w-3 opacity-80" />
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, staff ID or department…"
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] hover:border-gray-300 transition-colors placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Trainer list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <Users className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No trainers found</p>
            </div>
          )}
          {filtered.map(t => {
            const name       = t.short_name ?? `${t.first_name} ${t.last_name}`
            const dept       = typeof t.department === 'object' ? t.department?.name : t.department ?? ''
            const isAssigned = assignedIds.has(t.id)
            const isSaving   = saving === t.id

            // Avatar initials
            const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

            return (
              <button
                key={t.id}
                onClick={() => toggle(t)}
                disabled={isSaving}
                className={[
                  'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[.98]',
                  isAssigned
                    ? 'border-[#1e3a5f]/20 bg-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                {/* Checkbox */}
                <div className={[
                  'shrink-0 h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all',
                  isAssigned ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-gray-300',
                ].join(' ')}>
                  {isSaving
                    ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                    : isAssigned && <Check className="h-3 w-3 text-white" />
                  }
                </div>

                {/* Avatar */}
                <div className={[
                  'shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold ring-1',
                  isAssigned
                    ? 'bg-[#1e3a5f] text-white ring-[#1e3a5f]/30'
                    : 'bg-gray-100 text-gray-500 ring-gray-200',
                ].join(' ')}>
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-semibold truncate',
                    isAssigned ? 'text-[#1e3a5f]' : 'text-gray-800',
                  ].join(' ')}>
                    {name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    <span className="font-mono">{t.staff_id}</span>
                    {dept ? <span> · {dept}</span> : null}
                  </p>
                </div>

                {isAssigned && (
                  <span className="shrink-0 text-[10px] font-bold text-[#1e3a5f] bg-[#1e3a5f]/10 rounded-full px-2 py-0.5 ring-1 ring-[#1e3a5f]/10">
                    Assigned
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 shrink-0 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            <span className="font-semibold text-gray-600 tabular-nums">{assignedList.length}</span>{' '}
            trainer{assignedList.length !== 1 ? 's' : ''} assigned · Click any trainer to toggle
          </p>
        </div>
      </div>
    </div>
  )
}