'use client'

/**
 * TrainerAssignmentPanel
 * ─────────────────────
 * Drop this inside the curriculum TrainerPanel to show / edit the
 * TermTrainerAssignment for a single unit × term context.
 *
 * Props:
 *   unitId       – CurriculumUnit.id
 *   termId       – Term.id
 *   cohortId     – Cohort.id
 *   qualifiedTrainers – list already on the unit (from CurriculumUnitTrainer)
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, ChevronDown, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { queryKeys } from '@/types'
import {
  getTermAssignments,
  createTermAssignment,
  updateTermAssignment,
  deleteTermAssignment,
} from '@/services/timetable'
import type { TermTrainerAssignment } from '@/types'

interface Props {
  unitId:            string
  termId:            string
  cohortId:          string
  qualifiedTrainers: { id: string; name: string }[]
}

export function TrainerAssignmentPanel({
  unitId,
  termId,
  cohortId,
  qualifiedTrainers,
}: Props) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')

  const key = queryKeys.termAssignments(termId, cohortId)

  const { data: assignments = [], isLoading } = useQuery<TermTrainerAssignment[]>({
    queryKey: [...key, unitId],
    queryFn: () => getTermAssignments({ term: termId, curriculum_unit: unitId }),
    enabled:  !!termId && !!unitId,
  })

  // The assignment for this specific cohort (one-to-one)
  const existing = assignments.find(a => a.cohort === cohortId)

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: [...key, unitId] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return
      if (existing) {
        return updateTermAssignment(existing.id, { trainer: draft })
      }
      return createTermAssignment({
        term:            termId,
        cohort:          cohortId,
        curriculum_unit: unitId,
        trainer:         draft,
      })
    },
    onSuccess: () => {
      setDraft('')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTermAssignment(existing!.id),
    onSuccess:  invalidate,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading assignment…
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        Term Assignment
      </p>

      {existing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-200">
              {existing.trainer_name ?? existing.trainer}
            </span>
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            {deleteMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Trash2 className="h-3 w-3" />}
            Remove
          </button>
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500 italic">No trainer assigned for this term yet.</p>
      )}

      {/* Picker — always shown so user can change */}
      {qualifiedTrainers.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">{existing ? 'Change trainer…' : 'Assign trainer…'}</option>
              {qualifiedTrainers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!draft || saveMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            {saveMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <UserCheck className="h-3 w-3" />}
            {existing ? 'Update' : 'Assign'}
          </button>
        </div>
      )}

      {qualifiedTrainers.length === 0 && (
        <p className="mt-2 text-xs text-amber-400">
          No qualified trainers on record for this unit. Add them in the Curriculum setup first.
        </p>
      )}
    </div>
  )
}
