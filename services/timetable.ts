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

// ── Dashboard ──────────────────────────────────────────────────────────────────

export const getDashboard = (): Promise<DashboardData> =>
  api.get('/dashboard/').then((r) => r.data.data)

export const getTrainerDashboard = (): Promise<TrainerDashboardData> =>
  api.get('/dashboard/trainer/').then((r) => r.data.data)

// ── Master timetable ───────────────────────────────────────────────────────────

export const getMasterTimetable = (termId: string): Promise<MasterTimetableData> =>
  api.get('/timetable/master/', { params: { term: termId } }).then((r) => r.data.data)

// ── Cohort timetable ───────────────────────────────────────────────────────────
// Backend: GET /api/timetable/cohort/<uuid:cohort_id>/?term=<uuid>
export const getCohortTimetable = (cohortId: string, termId: string) =>
  api
    .get(`/timetable/cohort/${cohortId}/`, { params: { term: termId } })
    .then((r) => r.data.data)

// ── Trainer timetable ──────────────────────────────────────────────────────────
// Backend: GET /api/timetable/trainer/<uuid:trainer_id>/?term=<uuid>
export const getTrainerTimetable = (trainerId: string, termId: string) =>
  api
    .get(`/timetable/trainer/${trainerId}/`, { params: { term: termId } })
    .then((r) => r.data.data)

// ── Conflicts ──────────────────────────────────────────────────────────────────

export const getConflicts = (termId: string): Promise<Conflict[]> =>
  api.get('/conflicts/', { params: { term: termId } }).then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })

// ── Scheduled unit CRUD ────────────────────────────────────────────────────────
// Backend: /api/timetable/entry/<uuid>/ (singular)

export const getScheduledUnits = (termId: string): Promise<ScheduledUnit[]> =>
  api.get('/timetable/entries/', { params: { term: termId } }).then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })

export const updateScheduledUnit = (id: string, payload: Partial<ScheduledUnit>) =>
  api.put(`/timetable/entry/${id}/`, payload).then((r) => r.data.data)

export const deleteScheduledUnit = (id: string) =>
  api.delete(`/timetable/entry/${id}/`).then(() => ({ ok: true }))

// ── Generate / Publish ─────────────────────────────────────────────────────────

export const generateTimetable = (termId: string) =>
  api.post('/timetable/generate/', { term: termId }).then((r) => r.data)

export const publishTimetable = (termId: string) =>
  api.post('/timetable/publish/', { term: termId }).then((r) => r.data)

// ── Term trainer assignments ───────────────────────────────────────────────────
// Backend: /api/term-assignments/ (no timetable/ prefix)

export const getTermAssignments = (termId: string): Promise<TermTrainerAssignment[]> =>
  api.get('/term-assignments/', { params: { term: termId } }).then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })

export const createTermAssignment = (payload: TermTrainerAssignmentPayload) =>
  api.post('/term-assignments/', payload).then((r) => r.data.data)

export const updateTermAssignment = (
  id: string,
  payload: Partial<TermTrainerAssignmentPayload>
) => api.put(`/term-assignments/${id}/`, payload).then((r) => r.data.data)

export const deleteTermAssignment = (id: string) =>
  api.delete(`/term-assignments/${id}/`).then(() => ({ ok: true }))

// ── Periods ────────────────────────────────────────────────────────────────────

export const getPeriods = (): Promise<Period[]> =>
  api.get('/periods/').then((r) => {
    const d = r.data.data
    return Array.isArray(d) ? d : (d?.results ?? [])
  })