import api from '@/lib/api'
import type {
  Institution, Department, Programme, CurriculumUnit,
  Period, Room, Trainer, Term, Cohort, Constraint,
} from '@/types'

// ── Pagination helper ─────────────────────────────────────────────────────────
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: T[] }).results
  }
  return []
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getInstitution = () =>
  api.get('/institution/').then(r => r.data.data as Institution)

export const getDepartments = () =>
  api.get('/departments/').then(r => unwrapList<Department>(r.data.data))

export const getProgrammes = () =>
  api.get('/programmes/').then(r => unwrapList<Programme>(r.data.data))

export const getCurriculum = (programmeId: string, termNumber?: number) => {
  const params = new URLSearchParams({ programme: programmeId })
  if (termNumber) params.append('term_number', String(termNumber))
  return api.get(`/curriculum/?${params}`).then(r => unwrapList<CurriculumUnit>(r.data.data))
}

// Fetches all curriculum units across all programmes — used by ConstraintsPage
export const getAllCurriculum = () =>
  api.get('/curriculum/').then(r => unwrapList<CurriculumUnit>(r.data.data))

export const getPeriods = () =>
  api.get('/periods/').then(r => unwrapList<Period>(r.data.data))

export const getRooms = () =>
  api.get('/rooms/').then(r => unwrapList<Room>(r.data.data))

export const getTrainers = () =>
  api.get('/trainers/').then(r => unwrapList<Trainer>(r.data.data))

export const getTerms = () =>
  api.get('/terms/').then(r => unwrapList<Term>(r.data.data))

export const getCohorts = () =>
  api.get('/cohorts/').then(r => unwrapList<Cohort>(r.data.data))

export const getConstraints = () =>
  api.get('/constraints/').then(r => unwrapList<Constraint>(r.data.data))

export const getTrainerAvailability = (trainerId: string) =>
  api.get(`/trainers/${trainerId}/availability/`).then(r => r.data.data)

export const getCohortProgress = (cohortId: string) =>
  api.get(`/cohorts/${cohortId}/progress/`).then(r => r.data.data)

// ── Mutations ─────────────────────────────────────────────────────────────────

export const createTerm = (payload: Partial<Term>) =>
  api.post('/terms/', payload).then(r => r.data)

export const createCohort = (payload: object) =>
  api.post('/cohorts/', payload).then(r => r.data)

export const advanceCohort = (cohortId: string) =>
  api.post(`/cohorts/${cohortId}/advance/`).then(r => r.data)

export const updateProgress = (cohortId: string, payload: object) =>
  api.post(`/cohorts/${cohortId}/progress/update/`, payload).then(r => r.data)

export const createConstraint = (payload: object) =>
  api.post('/constraints/', payload).then(r => r.data)

export const updateConstraint = (constraintId: string, payload: object) =>
  api.put(`/constraints/${constraintId}/`, payload).then(r => r.data)

export const deleteConstraint = (constraintId: string) =>
  api.delete(`/constraints/${constraintId}/`).then(() => ({ ok: true }))

export const setTrainerAvailability = (trainerId: string, payload: object) =>
  api.post(`/trainers/${trainerId}/availability/`, payload).then(r => r.data)