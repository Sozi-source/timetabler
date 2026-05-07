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

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboard = () =>
  api.get('/dashboard/').then(r => r.data.data as DashboardData)

export const getTrainerDashboard = () =>
  api.get('/dashboard/trainer/').then(r => r.data.data as TrainerDashboardData)

// ── Timetable ─────────────────────────────────────────────────────────────────

export const getMasterTimetable = (termId: string): Promise<MasterTimetableData> =>
  api.get(`/timetable/master/?term=${termId}&status=DRAFT`).then(r => {
    const d = r.data.data
    if (!d) {
      return {
        grid: {},
        periods: [] as Period[],
        days: [] as string[],
        status: 'DRAFT' as const,
        total_entries: 0,
      }
    }

    const periods: Period[] = (d.periods ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      start_time: (p.start_time ?? p.start ?? '') as string,
      end_time:   (p.end_time   ?? p.end   ?? '') as string,
      is_break:   (p.is_break   ?? false)          as boolean,
    } as Period))

    return {
      grid:          d.grid          ?? {},
      periods,
      days:          d.days          ?? [],
      status:        d.status        ?? 'DRAFT',
      total_entries: d.total_entries ?? 0,
    }
  })

export const getCohortTimetable = (cohortId: string, termId: string) =>
  api
    .get(`/timetable/cohort/?cohort=${cohortId}&term=${termId}`)
    .then(r => r.data.data)

export const getTrainerTimetable = (trainerId: string, termId: string) =>
  api
    .get(`/timetable/trainer/?trainer=${trainerId}&term=${termId}`)
    .then(r => r.data.data)

// ── Conflicts ─────────────────────────────────────────────────────────────────

export const getConflicts = (termId: string) =>
  api.get(`/conflicts/?term=${termId}`).then(r => r.data.data as Conflict[])

// ── Mutations ─────────────────────────────────────────────────────────────────

export const generateTimetable = (termId: string) =>
  api.post(`/timetable/generate/`, { term_id: termId }, { timeout: 300_000 }).then(r => r.data)

export const publishDrafts = (termId: string) =>
  api.post('/timetable/publish/', { term_id: termId }).then(r => r.data)

export const clearDrafts = (termId: string) =>
  api.delete('/timetable/drafts/', { data: { term_id: termId } }).then(r => r.data)

export const updateScheduledUnit = (id: string, payload: Partial<ScheduledUnit>) =>
  api.patch(`/timetable/entries/${id}/`, payload).then(r => r.data.data as ScheduledUnit)

export const deleteScheduledUnit = (id: string) =>
  api.delete(`/timetable/entries/${id}/`).then(r => r.data)

// Aliases used by EntryEditModal
export const updateEntry = updateScheduledUnit
export const deleteEntry = deleteScheduledUnit
export const publishTimetable = publishDrafts
export const deleteDrafts = clearDrafts

// ── Term Trainer Assignments ──────────────────────────────────────────────────

export const getTermAssignments = (params?: { term?: string; cohort?: string }) =>
  api
    .get('/timetable/term-assignments/', { params })
    .then(r => r.data.data as TermTrainerAssignment[])

export const getTermAssignmentsByUnit = (params: {
  term: string
  curriculum_unit: string
}) =>
  api
    .get('/timetable/term-assignments/by-unit/', { params })
    .then(r => r.data.data as TermTrainerAssignment[])

export const createTermAssignment = (data: TermTrainerAssignmentPayload) =>
  api
    .post('/timetable/term-assignments/', data)
    .then(r => r.data.data as TermTrainerAssignment)

export const bulkTermAssignments = (assignments: TermTrainerAssignmentPayload[]) =>
  api
    .post('/timetable/term-assignments/bulk/', { assignments })
    .then(r => r.data.data as { created: number; updated: number; skipped: number })

export const updateTermAssignment = (
  id: string,
  data: Partial<TermTrainerAssignmentPayload>
) =>
  api
    .patch(`/timetable/term-assignments/${id}/`, data)
    .then(r => r.data.data as TermTrainerAssignment)

export const deleteTermAssignment = (id: string) =>
  api.delete(`/timetable/term-assignments/${id}/`).then(r => r.data)