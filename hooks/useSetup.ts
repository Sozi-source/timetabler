import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import {
  getInstitution, getDepartments, getProgrammes,
  getPeriods, getRooms, getTrainers, getTerms,
  getCohorts, getConstraints, getCurriculum,
  getTrainerAvailability, getCohortProgress,
} from '@/services/setup'

export const useInstitution = () =>
  useQuery({ queryKey: queryKeys.institution, queryFn: getInstitution })

export const useDepartments = () =>
  useQuery({ queryKey: queryKeys.departments, queryFn: getDepartments })

export const useProgrammes = () =>
  useQuery({ queryKey: queryKeys.programmes, queryFn: getProgrammes })

export const useCurriculum = (programmeId: string, termNumber?: number) =>
  useQuery({
    queryKey: queryKeys.curriculum(programmeId, termNumber),
    queryFn: () => getCurriculum(programmeId, termNumber),
    enabled: !!programmeId,
  })

export const usePeriods = () =>
  useQuery({ queryKey: queryKeys.periods, queryFn: getPeriods })

export const useRooms = () =>
  useQuery({ queryKey: queryKeys.rooms, queryFn: getRooms })

export const useTrainers = () =>
  useQuery({ queryKey: queryKeys.trainers, queryFn: getTrainers })

export const useTerms = () =>
  useQuery({ queryKey: queryKeys.terms, queryFn: getTerms })

export const useCohorts = () =>
  useQuery({ queryKey: queryKeys.cohorts, queryFn: getCohorts })

export const useConstraints = () =>
  useQuery({ queryKey: queryKeys.constraints, queryFn: getConstraints })

export const useTrainerAvailability = (trainerId: string) =>
  useQuery({
    queryKey: queryKeys.availability(trainerId),
    queryFn: () => getTrainerAvailability(trainerId),
    enabled: !!trainerId,
  })

export const useCohortProgress = (cohortId: string) =>
  useQuery({
    queryKey: queryKeys.cohortProgress(cohortId),
    queryFn: () => getCohortProgress(cohortId),
    enabled: !!cohortId,
  })
