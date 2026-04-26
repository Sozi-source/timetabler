import api from '@/lib/api'
import type { ScheduledUnit, Conflict, DashboardData, TrainerDashboardData } from '@/types'

export const getDashboard = () =>
  api.get('/dashboard/').then(r => r.data.data as DashboardData)

export const getTrainerDashboard = () =>
  api.get('/dashboard/trainer/').then(r => r.data.data as TrainerDashboardData)

export const getMasterTimetable = (termId: string) =>
  api.get(`/timetable/master/?term=${termId}`).then(r => r.data.data as ScheduledUnit[])

export const getCohortTimetable = (cohortId: string, termId: string) =>
  api.get(`/timetable/cohort/${cohortId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return { entries: [], periods: [], days: [] }
    const flat: ScheduledUnit[] = []
    console.log('GRID KEYS:', Object.keys(d.grid ?? {}))
    console.log('FIRST DAY:', JSON.stringify(Object.values(d.grid ?? {})[0]))
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push({
          ...e,
          period:       e.period_id   ?? e.period,
          period_label: e.period_label ?? '',
          cohort:       e.cohort_id   ?? e.cohort,
          cohort_name:  e.cohort      ?? '',
          trainer:      e.trainer_id  ?? e.trainer,
          trainer_name: e.trainer     ?? '',
          room:         e.room_id     ?? e.room,
          room_code:    e.room        ?? '',
          curriculum_unit: e.id,
        })
      })
    })
    const periods = (d.periods ?? []).map((p: any) => ({
        ...p,
        start_time: p.start_time ?? p.start ?? '',
        end_time:   p.end_time   ?? p.end   ?? '',
      }))
      return { entries: flat, periods, days: d.days ?? [] }
  })

export const getTrainerTimetable = (trainerId: string, termId: string) =>
  api.get(`/timetable/trainer/${trainerId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return { entries: [], periods: [], days: [] }
    const flat: ScheduledUnit[] = []
    console.log('GRID KEYS:', Object.keys(d.grid ?? {}))
    console.log('FIRST DAY:', JSON.stringify(Object.values(d.grid ?? {})[0]))
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push({
          ...e,
          period:       e.period_id   ?? e.period,
          period_label: e.period_label ?? '',
          cohort:       e.cohort_id   ?? e.cohort,
          cohort_name:  e.cohort      ?? '',
          trainer:      e.trainer_id  ?? e.trainer,
          trainer_name: e.trainer     ?? '',
          room:         e.room_id     ?? e.room,
          room_code:    e.room        ?? '',
          curriculum_unit: e.id,
        })
      })
    })
    const periods = (d.periods ?? []).map((p: any) => ({
      ...p,
      start_time: p.start ?? p.start_time ?? '',
      end_time:   p.end   ?? p.end_time   ?? '',
      is_break:   p.is_break ?? false,
    }))
    return { entries: flat, periods, days: d.days ?? [] }
  })

export const generateTimetable = (termId?: string) =>
  api.post('/timetable/generate/', { term_id: termId ?? null }).then(r => r.data)

export const publishTimetable = (termId?: string, force = false) =>
  api.post('/timetable/publish/', { term_id: termId ?? null, force }).then(r => r.data)

export const deleteDrafts = (termId?: string) =>
  api.delete('/timetable/drafts/', { data: { term_id: termId ?? null } }).then(r => r.data)

export const updateEntry = (
  entryId: string,
  payload: Partial<{ trainer_id: string; room_id: string; period_id: string; day: string; notes: string }>
) => api.put(`/timetable/entry/${entryId}/`, payload).then(r => r.data)

export const deleteEntry = (entryId: string) =>
  api.delete(`/timetable/entry/${entryId}/`).then(r => r.data)

export const getConflicts = (termId: string) =>
  api.get(`/conflicts/?term=${termId}`).then(r => r.data.data as Conflict[])

export const resolveConflict = (
  conflictId: string,
  note: string,
  method: 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED'
) => api.post(`/conflicts/${conflictId}/resolve/`, { note, method }).then(r => r.data)

export const exportMaster = (termId: string, fmt = 'html') =>
  api.get(`/export/master/?term=${termId}&fmt=${fmt}`, { responseType: 'blob' })

export const exportCohort = (cohortId: string, termId: string) =>
  api.get(`/export/cohort/${cohortId}/?term=${termId}`, { responseType: 'blob' })

export const exportTrainer = (trainerId: string, termId: string) =>
  api.get(`/export/trainer/${trainerId}/?term=${termId}`, { responseType: 'blob' })