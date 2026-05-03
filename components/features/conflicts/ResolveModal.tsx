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
  HIGH:   { bg: 'bg-red-50',   border: 'border-red-200',   badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'   },
  MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  LOW:    { bg: 'bg-blue-50',  border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'  },
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

  // Early return AFTER all hooks
  if (!conflict) return null

  const sev = SEVERITY_CONFIG[conflict.severity] ?? SEVERITY_CONFIG.LOW
  const rawType = (conflict.conflict_type ?? '').toUpperCase().replace(/\s+/g, '_')
  const advice = CONFLICT_ADVICE[rawType] ?? DEFAULT_ADVICE
  const isPending = conflict.resolution_status === 'PENDING'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`px-6 py-4 ${sev.bg} ${sev.border} border-b flex items-start justify-between gap-4`}>
          <div className="flex items-start gap-3">
            <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${sev.dot}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
                  {conflict.severity}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {conflict.conflict_type}
                </span>
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-800 leading-snug">
                {advice.title}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Involved entities */}
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Involved</p>
            <div className="grid grid-cols-2 gap-2">
              {conflict.cohort_name && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="font-medium">{conflict.cohort_name}</span>
                </div>
              )}
              {conflict.trainer_name && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{conflict.trainer_name}</span>
                </div>
              )}
              {conflict.unit_code && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <BookOpen size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="font-mono">{conflict.unit_code}</span>
                </div>
              )}
              {conflict.room_code && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{conflict.room_code}</span>
                </div>
              )}
            </div>
            {conflict.description && (
              <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                {conflict.description}
              </p>
            )}
          </div>

          {/* How to fix */}
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How to fix</p>
            <ol className="space-y-2">
              {advice.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            {advice.link && (
              <a href={advice.link.href} className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <ExternalLink size={13} />
                {advice.link.label}
                <ChevronRight size={13} />
              </a>
            )}
          </div>

          {/* Resolution note */}
          <div className="px-6 py-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Resolution note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Describe how this was resolved…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
            Close
          </button>
          {isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolveMutation.mutate('IGNORED')}
                disabled={resolveMutation.isPending}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium disabled:opacity-50"
              >
                <EyeOff size={14} />
                Ignore
              </button>
              <button
                onClick={() => resolveMutation.mutate('RESOLVED')}
                disabled={resolveMutation.isPending}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
              >
                <CheckCircle size={14} />
                {resolveMutation.isPending ? 'Saving…' : 'Mark Resolved'}
              </button>
            </div>
          ) : (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              conflict.resolution_status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {conflict.resolution_status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}