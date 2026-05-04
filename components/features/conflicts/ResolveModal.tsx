'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle, EyeOff, ExternalLink, User, BookOpen, Building2, ChevronRight } from 'lucide-react'
import { queryKeys } from '@/types'
import api from '@/lib/api'
import type { Conflict } from '@/types'

interface Props {
  conflict: Conflict | null
  termId: string
  onClose: () => void
}

const SEVERITY_CONFIG = {
  HIGH:   { bg: 'bg-red-50',   border: 'border-red-100',   badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',    dot: 'bg-red-500',    header: 'from-red-50 to-rose-50'   },
  MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500', header: 'from-amber-50 to-orange-50' },
  LOW:    { bg: 'bg-blue-50',  border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',   dot: 'bg-blue-400',   header: 'from-blue-50 to-sky-50'   },
}

const CONFLICT_ADVICE: Record<string, { title: string; steps: string[]; link?: { label: string; href: string } }> = {
  TRAINER_DOUBLE_BOOKED: {
    title: 'Trainer is scheduled in two places at once',
    steps: [
      'Go to the Master Timetable and find both conflicting slots',
      'Edit one of the entries to assign a different trainer',
      'Or move one session to a different time slot',
      'Regenerate will also attempt to fix this automatically',
    ],
    link: { label: 'View Master Timetable', href: '/timetable/master' },
  },
  ROOM_DOUBLE_BOOKED: {
    title: 'Room is assigned to two sessions at the same time',
    steps: [
      'Go to the Master Timetable and find both conflicting sessions',
      'Edit one session to assign a different room',
      'Or move one session to a different time slot',
    ],
    link: { label: 'View Master Timetable', href: '/timetable/master' },
  },
  COHORT_DOUBLE_BOOKED: {
    title: 'Cohort has two sessions scheduled at the same time',
    steps: [
      'Go to the Cohort Timetable to see the clash',
      'Edit one entry to move it to a free slot',
      'Regenerating the timetable will clear and rebuild from scratch',
    ],
    link: { label: 'View Master Timetable', href: '/timetable/master' },
  },
  UNPLACED_UNIT: {
    title: 'This unit could not be scheduled',
    steps: [
      'Check that the unit has at least one qualified trainer assigned',
      'Verify the trainer has available days that work for this cohort',
      'Add more trainer options in Setup → Curriculum Units',
      'Then regenerate the timetable',
    ],
    link: { label: 'Go to Curriculum Units', href: '/setup/units' },
  },
  NO_TRAINER: {
    title: 'No trainer is assigned to this unit',
    steps: [
      'Go to Setup → Curriculum Units',
      'Find this unit and add qualified trainers',
      'Then regenerate the timetable',
    ],
    link: { label: 'Go to Curriculum Units', href: '/setup/curriculum' },
  },
  NO_ROOM: {
    title: 'No suitable room could be found',
    steps: [
      'Check that rooms are set up in Setup → Rooms',
      'Verify room capacity matches the cohort size',
      'Ensure the room is available on the required days',
    ],
    link: { label: 'Go to Rooms Setup', href: '/setup/rooms' },
  },
  TRAINER_OVERLOADED: {
    title: 'Trainer exceeds their maximum periods per week',
    steps: [
      "Go to Setup → Trainers and increase the trainer's max periods",
      'Or reassign some units to other qualified trainers',
      'Then regenerate the timetable',
    ],
    link: { label: 'Go to Trainers Setup', href: '/setup/trainers' },
  },
}

const DEFAULT_ADVICE = {
  title: 'Review and resolve this conflict',
  steps: [
    'Check the timetable for the affected cohort or trainer',
    'Edit the relevant entries to fix the clash',
    'Mark as resolved once the issue is fixed',
  ],
}

export default function ResolveModal({ conflict, termId, onClose }: Props) {
  const [note, setNote] = useState(conflict?.resolution_note || '')
  const qc = useQueryClient()

  const resolveMutation = useMutation({
    mutationFn: (method: string) =>
      api.post(`/conflicts/${conflict?.id}/resolve/`, { note, method }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) })
      onClose()
    },
  })

  if (!conflict) return null

  const sev    = SEVERITY_CONFIG[conflict.severity] ?? SEVERITY_CONFIG.LOW
  const rawType = (conflict.conflict_type ?? '').toUpperCase().replace(/\s+/g, '_')
  const advice  = CONFLICT_ADVICE[rawType] ?? DEFAULT_ADVICE
  const isPending = conflict.resolution_status === 'PENDING'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[92svh] sm:max-h-[90vh]">

        {/* Drag handle (mobile only) */}
        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className={`px-6 py-4 bg-gradient-to-r ${sev.header} border-b ${sev.border} flex items-start justify-between gap-4 shrink-0`}>
          <div className="flex items-start gap-3">
            <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${sev.dot} ring-2 ring-white`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${sev.badge}`}>
                  {conflict.severity}
                </span>
                <span className="text-[10px] text-gray-500 font-mono bg-white/60 rounded-md px-1.5 py-0.5">
                  {conflict.conflict_type}
                </span>
              </div>
              <h2 className="mt-1.5 text-sm font-bold text-gray-900 leading-snug">
                {advice.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-xl p-1.5 hover:bg-white/60 shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Involved entities */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Involved</p>
            <div className="grid grid-cols-2 gap-2">
              {conflict.cohort_name && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
                  <User size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 truncate">{conflict.cohort_name}</span>
                </div>
              )}
              {conflict.trainer_name && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
                  <User size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{conflict.trainer_name}</span>
                </div>
              )}
              {conflict.unit_code && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
                  <BookOpen size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-mono font-semibold text-gray-700">{conflict.unit_code}</span>
                </div>
              )}
              {conflict.room_code && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
                  <Building2 size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{conflict.room_code}</span>
                </div>
              )}
            </div>
            {conflict.description && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100 leading-relaxed">
                {conflict.description}
              </p>
            )}
          </div>

          {/* How to fix */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">How to fix</p>
            <ol className="space-y-2.5">
              {advice.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#1e3a5f]/8 text-[#1e3a5f] text-[10px] font-bold flex items-center justify-center mt-0.5 ring-1 ring-[#1e3a5f]/10">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            {advice.link && (
              <a
                href={advice.link.href}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3a5f] hover:text-[#162d4a] bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 rounded-xl px-3 py-2 transition-colors ring-1 ring-[#1e3a5f]/10"
              >
                <ExternalLink size={12} />
                {advice.link.label}
                <ChevronRight size={12} />
              </a>
            )}
          </div>

          {/* Resolution note */}
          <div className="px-6 py-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Resolution note <span className="text-gray-300 font-normal normal-case tracking-normal">— optional</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Describe how this was resolved…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] text-gray-700 placeholder:text-gray-300 transition-all hover:border-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors"
          >
            Close
          </button>

          {isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolveMutation.mutate('IGNORED')}
                disabled={resolveMutation.isPending}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold disabled:opacity-50 transition-all active:scale-[.98] shadow-sm"
              >
                <EyeOff size={13} />
                Ignore
              </button>
              <button
                onClick={() => resolveMutation.mutate('RESOLVED')}
                disabled={resolveMutation.isPending}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition-all active:scale-[.98] shadow-sm"
              >
                <CheckCircle size={13} />
                {resolveMutation.isPending ? 'Saving…' : 'Mark Resolved'}
              </button>
            </div>
          ) : (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              conflict.resolution_status === 'RESOLVED'
                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
            }`}>
              {conflict.resolution_status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}