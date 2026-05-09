/**
 * useTermAssignments
 * ──────────────────
 * React Query hook for fetching and mutating TermTrainerAssignments.
 *
 * Usage:
 *   const { assignments, isLoading, save, remove } = useTermAssignments(termId, cohortId)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import {
  getTermAssignments,
  bulkTermAssignments,
  deleteTermAssignment,
} from '@/services/timetable'
import type { TermTrainerAssignment, TermTrainerAssignmentPayload } from '@/types'

export function useTermAssignments(termId: string, cohortId: string) {
  const qc  = useQueryClient()
  const key = queryKeys.termAssignments(termId, cohortId)

  const query = useQuery<TermTrainerAssignment[]>({
    queryKey: key,
    queryFn:  () => getTermAssignments({ term: termId, cohort: cohortId }),
    enabled:  !!termId && !!cohortId,
    staleTime: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: key })

  const bulkSave = useMutation({
    mutationFn: (rows: TermTrainerAssignmentPayload[]) => bulkTermAssignments(rows),
    onSuccess:  invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTermAssignment(id),
    onSuccess:  invalidate,
  })

  /** Map of curriculum_unit_id → TermTrainerAssignment for fast lookup */
  const assignmentMap: Record<string, TermTrainerAssignment> = Object.fromEntries(
    (query.data ?? []).map(a => [a.curriculum_unit, a])
  )

  return {
    assignments:   query.data ?? [],
    assignmentMap,
    isLoading:     query.isLoading,
    isError:       query.isError,
    refetch:       query.refetch,

    /** Save / upsert a full set of assignments for this term+cohort */
    bulkSave:      bulkSave.mutate,
    isSaving:      bulkSave.isPending,
    saveError:     bulkSave.error,

    /** Delete a single assignment by its id */
    remove:        remove.mutate,
    isRemoving:    remove.isPending,
  }
}


