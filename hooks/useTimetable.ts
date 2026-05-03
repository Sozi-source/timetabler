import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import type { MasterTimetableData, Conflict, DashboardData, TrainerDashboardData } from '@/types'
import {
  getDashboard,
  getTrainerDashboard,
  getMasterTimetable,
  getCohortTimetable,
  getTrainerTimetable,
  getConflicts,
} from '@/services/timetable'

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const useDashboard = () =>
  useQuery<DashboardData>({
    queryKey:              queryKeys.dashboard,
    queryFn:               getDashboard,
    staleTime:             30_000,        // fresh for 30s — avoids refetch on every focus
    refetchInterval:       60_000,        // background poll every 60s
    refetchOnWindowFocus:  false,
  })

export const useTrainerDashboard = () =>
  useQuery<TrainerDashboardData>({
    queryKey:              queryKeys.trainerDash,
    queryFn:               getTrainerDashboard,
    staleTime:             30_000,
    refetchInterval:       60_000,
    refetchOnWindowFocus:  false,
  })

// ── Timetable grids ───────────────────────────────────────────────────────────

export const useMasterTimetable = (termId: string) =>
  useQuery<MasterTimetableData>({
    queryKey:              queryKeys.masterTT(termId),
    queryFn:               () => getMasterTimetable(termId),
    enabled:               !!termId,
    staleTime:             15_000,        // fresh for 15s
    refetchOnWindowFocus:  false,         // don't reload when switching tabs
  })

export const useCohortTimetable = (cohortId: string, termId: string) =>
  useQuery({
    queryKey:              queryKeys.cohortTT(cohortId, termId),
    queryFn:               () => getCohortTimetable(cohortId, termId),
    enabled:               !!cohortId && !!termId,
    staleTime:             15_000,
    refetchOnWindowFocus:  false,
  })

export const useTrainerTimetable = (trainerId: string, termId: string) =>
  useQuery({
    queryKey:              queryKeys.trainerTT(trainerId, termId),
    queryFn:               () => getTrainerTimetable(trainerId, termId),
    enabled:               !!trainerId && !!termId,
    staleTime:             15_000,
    refetchOnWindowFocus:  false,
  })

// ── Conflicts ─────────────────────────────────────────────────────────────────

export const useConflicts = (termId: string) =>
  useQuery<Conflict[]>({
    queryKey:              queryKeys.conflicts(termId),
    queryFn:               () => getConflicts(termId),
    enabled:               !!termId,
    staleTime:             30_000,        // was hammering every few seconds — now 30s fresh
    refetchInterval:       60_000,        // background poll every 60s
    refetchOnWindowFocus:  false,         // don't fire on tab switch
  })