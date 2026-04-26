import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import {
  getDashboard, getTrainerDashboard,
  getMasterTimetable, getCohortTimetable,
  getTrainerTimetable, getConflicts,
} from '@/services/timetable'

export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard })

export const useTrainerDashboard = () =>
  useQuery({ queryKey: queryKeys.trainerDash, queryFn: getTrainerDashboard })

export const useMasterTimetable = (termId: string) =>
  useQuery({
    queryKey: queryKeys.masterTT(termId),
    queryFn: () => getMasterTimetable(termId),
    enabled: !!termId,
  })

export const useCohortTimetable = (cohortId: string, termId: string) =>
  useQuery({
    queryKey: queryKeys.cohortTT(cohortId, termId),
    queryFn: () => getCohortTimetable(cohortId, termId),
    enabled: !!cohortId && !!termId,
  })

export const useTrainerTimetable = (trainerId: string, termId: string) =>
  useQuery({
    queryKey: queryKeys.trainerTT(trainerId, termId),
    queryFn: () => getTrainerTimetable(trainerId, termId),
    enabled: !!trainerId && !!termId,
  })

export const useConflicts = (termId: string) =>
  useQuery({
    queryKey: queryKeys.conflicts(termId),
    queryFn: () => getConflicts(termId),
    enabled: !!termId,
  })
