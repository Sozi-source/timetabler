import api from '@/lib/api'
import type {
  ScheduledUnit,
  Conflict,
  DashboardData,
  TrainerDashboardData,
  MasterTimetableData,
  Period,
  TermTrainerAssignment,
  TermTrainerAssignmentPayload,
} from '@/types'

// -- Dashboard ------------------------------------------------------------------

export const getDashboard = (): Promise<DashboardData> =>
  api.get('/dashboard/').then((r) => r.data.data)

export const getTrainerDashboard = (): Promise<TrainerDashboardData> =>
  api.get('/dashboard/trainer/').then((r) => r.data.data)

// -- Master timetable -----------------------------------------------------------

export const getMasterTimetable = (termId: string): Promise<MasterTimetableData> =>
  api.get('/timetable/master/', { params: { term: termId } }).then((r) => r.data.data)

// -- Cohort timetable -----------------------------------------------------------

export const getCohortTimetable = (cohortId: string, termId: string) =>
  api
    .get(`/timetable/cohort/${cohortId}/`, { params: { term: termId } })
    .then((r) => r.data.data)

// -- Trainer timetable ----------------------------------------------------------

export const getTrainerTimetable = (trainerId: string, termId: string) =>
  api
    .get(`/timetable/trainer/${trainerId}/`, { params: { term: termId } })
    .then((r) => r.data.data)

// -- Conflicts ------------------------------------------------------------------

export const getConflicts = (termId: string): Promise<Conflict[]> =>
  api.get('/conflicts/', { params: { term: termId } }).then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })

// -- Scheduled unit CRUD --------------------------------------------------------

export const getScheduledUnits = (termId: string): Promise<ScheduledUnit[]> =>
  api.get('/timetable/entries/', { params: { term: termId } }).then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })

export const updateScheduledUnit = (id: string, payload: Partial<ScheduledUnit>) =>
  api.put(`/timetable/entry/${id}/`, payload).then((r) => r.data.data)

export const deleteScheduledUnit = (id: string) =>
  api.delete(`/timetable/entry/${id}/`).then(() => ({ ok: true }))

// -- Generate / Publish / Revert ------------------------------------------------
// All use query params so _term_from_request resolves correctly on the backend.

export const generateTimetable = (termId: string) =>
  api
    .post('/timetable/generate/', { term_id: termId }, { params: { term: termId } })
    .then((r) => r.data)

export const publishTimetable = (termId: string, force = false) =>
  api
    .post('/timetable/publish/', { term_id: termId, ...(force && { force: true }) }, { params: { term: termId } })
    .then((r) => r.data)

export const revertToDraft = (termId: string) =>
  api
    .post('/timetable/revert/', { term_id: termId }, { params: { term: termId } })
    .then((r) => r.data)

// -- Clear drafts ---------------------------------------------------------------
// Must use query params — DRF does not parse DELETE request bodies by default.

export const deleteDrafts = (termId: string): Promise<void> =>
  api
    .delete('/timetable/drafts/', { params: { term: termId } })
    .then(() => undefined)

// -- Individual entry CRUD ------------------------------------------------------

export const updateEntry = (id: string, data: Partial<ScheduledUnit>): Promise<ScheduledUnit> =>
  api.put(`/timetable/entry/${id}/`, data).then((r) => r.data.data)

export const deleteEntry = (id: string): Promise<void> =>
  api.delete(`/timetable/entry/${id}/`).then(() => undefined)

// -- Term trainer assignments ---------------------------------------------------

export const getTermAssignments = (params: {
  term: string
  cohort?: string
  curriculum_unit?: string
}): Promise<TermTrainerAssignment[]> =>
  api
    .get('/term-assignments/', {
      params: {
        term:            params.term,
        cohort:          params.cohort,
        curriculum_unit: params.curriculum_unit,
      },
    })
    .then((r) => {
      const d = r.data.data
      return Array.isArray(d) ? d : (d?.results ?? [])
    })

export const createTermAssignment = (payload: TermTrainerAssignmentPayload) =>
  api.post('/term-assignments/', payload).then((r) => r.data.data)

export const updateTermAssignment = (
  id: string,
  payload: Partial<TermTrainerAssignmentPayload>,
) => api.put(`/term-assignments/${id}/`, payload).then((r) => r.data.data)

export const deleteTermAssignment = (id: string) =>
  api.delete(`/term-assignments/${id}/`).then(() => ({ ok: true }))

export const bulkTermAssignments = (
  termId: string,
  rows: TermTrainerAssignmentPayload[],
): Promise<{ created: number; updated: number; errors: unknown[] }> =>
  api
    .post('/term-assignments/bulk/', { term_id: termId, assignments: rows })
    .then((r) => r.data.data)

// -- Periods --------------------------------------------------------------------

export const getPeriods = (): Promise<Period[]> =>
  api.get('/periods/').then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })