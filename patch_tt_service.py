path = 'services/timetable.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix trainer timetable to return full data
old = """getTrainerTimetable = (trainerId: string, termId: string) =>
  api.get(`/timetable/trainer/${trainerId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return []
    const flat: ScheduledUnit[] = []
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push(e)
      })
    })
    return flat
  })"""

new = """getTrainerTimetable = (trainerId: string, termId: string) =>
  api.get(`/timetable/trainer/${trainerId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return { entries: [], periods: [], days: [] }
    const flat: ScheduledUnit[] = []
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push(e)
      })
    })
    return { entries: flat, periods: d.periods ?? [], days: d.days ?? [] }
  })"""

if old in c:
    print('Trainer: Found - patching')
    c = c.replace(old, new)
else:
    print('Trainer: MISS')

# Fix cohort timetable to return full data
old2 = """getCohortTimetable = (cohortId: string, termId: string) =>
  api.get(`/timetable/cohort/${cohortId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return []
    const flat: ScheduledUnit[] = []
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push(e)
      })
    })
    return flat
  })"""

new2 = """getCohortTimetable = (cohortId: string, termId: string) =>
  api.get(`/timetable/cohort/${cohortId}/?term=${termId}`).then(r => {
    const d = r.data.data
    if (!d) return { entries: [], periods: [], days: [] }
    const flat: ScheduledUnit[] = []
    Object.values(d.grid ?? {}).forEach((day: any) => {
      Object.values(day as Record<string, any>).forEach((e: any) => {
        if (e) flat.push(e)
      })
    })
    return { entries: flat, periods: d.periods ?? [], days: d.days ?? [] }
  })"""

if old2 in c:
    print('Cohort: Found - patching')
    c = c.replace(old2, new2)
else:
    print('Cohort: MISS')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
