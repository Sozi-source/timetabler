# Timetabler — Frontend Context Document
> **Purpose:** Paste this at the start of every frontend chat session to restore full context instantly.
> **Last updated:** 2026-05-01
> **Backend status:** API fully built, running at http://localhost:8000

---

## INSTRUCTION FOR CLAUDE (READ FIRST)
You are building the React frontend for the Timetabler system — a constraint-based academic timetabling system for TVET colleges in Kenya. The Django REST API backend is fully built. Your job is to build UI components that consume it exactly as documented here. At the end of every session, update this context document with all changes made.

---

## BUILD PROGRESS

### Layer 1 - Foundation COMPLETE
### Layer 2 - Shell COMPLETE
### Layer 3 - Auth + Services COMPLETE
### Layer 4 - Dashboard COMPLETE
### Layer 5 - Data Hooks COMPLETE
### Layer 6 - Timetable Grid COMPLETE
### Layer 7 - Conflicts + Constraints COMPLETE
### Layer 8 - Setup CRUD Pages COMPLETE
### Layer 9 - Trainer Dashboard + Sub-Timetables COMPLETE
### Layer 10 - Bug Fixes COMPLETE
### Layer 11 - Template Literal Sweep COMPLETE
### Layer 12 - Timetable Page Alignment COMPLETE
### Layer 13 - Qualified Trainers + Constraints UX COMPLETE
### Layer 14 - Units on Offer + Timetable Cohort Fix COMPLETE

---

## Layer 14 Changes (2026-05-01)

### New: Units on Offer page
**Path:** `app/(dashboard)/setup/units-on-offer/page.tsx`

Full trainer assignment UI per cohort. Features:
- Loads all active cohorts from `/api/cohorts/`
- Fetches curriculum units per cohort using `cohort.programme_id` (UUID) + `cohort.current_term`
- Correct endpoint: `/api/curriculum/` (NOT `/api/curriculum-units/`)
- Trainer dropdown populated from `/api/trainers/` using `full_name` and `short_name`
- Assign trainer via `POST /api/curriculum/<uuid>/trainers/` with `{ trainer_id }`
- Outsourced units shown with amber "Outsourced" badge — no trainer assignment needed
- Progress bar showing overall assignment completion
- Shared units (same name across cohorts in same sharing_group) assigned together in parallel
- Added to Sidebar under Setup

### Fixed: Timetable page cohort count and filter
**Path:** `app/(dashboard)/timetable/page.tsx`

Root cause: API returns `cohort` as a string (cohort name) and `cohort_id` as a separate UUID field. The old code did `e.cohort.id` which was always `undefined`, collapsing all cohorts to one Map entry.

Fixes applied:
- Cohort count now uses `cohort_id` field: `new Map(allEntries.map(e => [e.cohort_id ?? e.cohort, ...]))`
- Filter comparison uses `cohort_id`: `entries.filter(e => (e.cohort_id ?? e.cohort) === selectedCohort)`
- Cell display uses `cohort_name` or falls back to string cohort field

### Fixed: Sidebar nav
**Path:** `components/layout/Sidebar.tsx`
- Added "Units on Offer" link under Setup section

---

## Layer 13 Changes (2026-04-26)

### New: CurriculumUnitTrainer through model (backend)
- `qualified_trainers` M2M on `CurriculumUnit` now uses `CurriculumUnitTrainer` through model
- Each assignment has `trainer_type` (INTERNAL/OUTSOURCED) and optional `label`
- New `is_outsourced` boolean on `CurriculumUnit` — marks units with no internal trainer

### New: Trainer assignment endpoints
```
GET  /api/curriculum/<id>/trainers/   — list assigned trainers
POST /api/curriculum/<id>/trainers/   — assign trainer { trainer_id, trainer_type, label }
DEL  /api/curriculum/<id>/trainers/   — remove trainer { trainer_id }
GET  /api/curriculum/<id>/            — unit detail
PUT  /api/curriculum/<id>/            — update unit (incl. is_outsourced)
```

### New: TrainerPanel component
**Path:** `components/features/curriculum/TrainerPanel.tsx`

Slide-in panel from the right. Features:
- Blue chip summary of assigned trainers at top
- Search box — filter by name, staff ID, or department
- Checkbox list of ALL trainers — click any to toggle assigned/unassigned instantly
- Spinner per trainer while saving
- Footer showing count of assigned trainers
- Triggered by "Manage" button (blue, light style) in Qualified Trainers column

### Modified: curriculum/page.tsx
- Added `trainerUnit` state — which unit's trainer panel is open
- Added `Users` icon import
- Added "Manage" button in Qualified Trainers column (bg-blue-50, blue text)
- Added `is_outsourced` to BLANK form and openEdit()
- Added Outsourced column to table (amber badge = Outsourced, gray = Internal)
- Added "Outsourced unit" toggle in SetupModal (amber toggle)
- Renders `<TrainerPanel>` when `trainerUnit` is set

### Modified: ConstraintModal
- Completely rebuilt — simplified to unit + day + period only
- No rule type selector (always PIN_DAY_PERIOD)
- Two-step fetch: programmes → curriculum units
- Fetches periods and rooms
- Hard constraint only (is_hard: true always)
- Optional preferred room field

---

## 1. Tech Stack

Framework: Next.js 16.2.4 App Router (NOT Vite)
Language: TypeScript strict mode
Styling: Tailwind CSS v4
Data fetching: TanStack Query v5
HTTP client: Axios with interceptors
State: Zustand (auth + term stores)
Icons: Lucide React
Forms: React Hook Form + Zod
Toasts: sonner

---

## 2. Project Structure (actual on disk)

```
fe-timetable/
  app/
    layout.tsx                                        DONE
    page.tsx                                          DONE
    (auth)/login/page.tsx                             DONE
    (dashboard)/
      layout.tsx                                      DONE
      dashboard/page.tsx                              DONE
      dashboard/trainer/page.tsx                      DONE
      timetable/page.tsx                              DONE ✓ FIXED (cohort count + filter)
      timetable/cohort/[cohortId]/page.tsx            DONE
      timetable/trainer/[id]/page.tsx                 DONE
      timetable/[id]/page.tsx                         DONE
      timetable/[id]/edit/page.tsx                    DONE
      conflicts/page.tsx                              DONE
      constraints/page.tsx                            DONE
      setup/
        institution/page.tsx                          DONE
        departments/page.tsx                          DONE
        programmes/page.tsx                           DONE
        curriculum/page.tsx                           DONE
        periods/page.tsx                              DONE
        rooms/page.tsx                                DONE
        trainers/page.tsx                             DONE
        terms/page.tsx                                DONE
        cohorts/page.tsx                              DONE
        units-on-offer/page.tsx                       DONE ← NEW
      schedule/page.tsx                               STUB
      settings/page.tsx                               STUB
  components/
    layout/Sidebar.tsx                                DONE ← UPDATED (Units on Offer link)
    layout/Topbar.tsx                                 DONE
    layout/AppShell.tsx                               DONE
    features/dashboard/StatCard.tsx                   DONE
    features/dashboard/ActionButton.tsx               DONE
    features/dashboard/TermProgress.tsx               DONE
    features/timetable/EntryCard.tsx                  DONE
    features/timetable/EntryEditModal.tsx             DONE
    features/timetable/TimetableGrid.tsx              DONE
    features/timetable/TimetableAI.tsx                DONE ← FIXED (AI chat working)
    features/conflicts/ConflictCard.tsx               DONE
    features/conflicts/ResolveModal.tsx               DONE
    features/constraints/ConstraintModal.tsx          DONE
    features/setup/SetupShell.tsx                     DONE
    features/setup/SetupTable.tsx                     DONE
    features/setup/SetupModal.tsx                     DONE
    features/curriculum/TrainerPanel.tsx              DONE
  lib/api.ts, auth.ts, providers.tsx, utils.ts       DONE
  services/setup.ts                                  DONE
  services/timetable.ts                              DONE
  store/index.ts                                     DONE
  types/index.ts                                     DONE
  hooks/useSetup.ts, useTimetable.ts, useAuth.ts     DONE
```

---

## 3. API Configuration

Base URL: http://localhost:8000/api/
Auth: Authorization: Token <token>
Login: POST /api/auth/login/ -> { token }
Me: GET /api/auth/me/ -> { ok: true, data: AuthUser }
Token: localStorage timetabler_token + cookie timetabler_token
Always unwrap: response.data.data

---

## 4. Key API Shapes (confirmed from live API)

### Cohort object (from /api/cohorts/)
```json
{
  "id": "uuid",
  "name": "CND JAN 26",
  "programme": "CERTIFICATE IN NUTRITION AND DIETETICS",
  "programme_id": "uuid",
  "current_term": 1,
  "is_active": true
}
```
⚠️ `programme` is the NAME string. Use `programme_id` for filtering curriculum units.

### Curriculum unit (from /api/curriculum/?programme=<uuid>&term_number=<n>)
```json
{
  "id": "uuid",
  "code": "CND1101",
  "name": "Communication Skills",
  "term_number": 1,
  "periods_per_week": 1,
  "is_outsourced": false,
  "qualified_trainers": [{ "id": "uuid", "name": "short_name", "trainer_type": "INTERNAL", "label": "" }]
}
```

### Trainer object (from /api/trainers/)
```json
{
  "id": "uuid",
  "staff_id": "ICM-010",
  "full_name": "Mrs Maureen Ayuma",
  "short_name": "Mrs Ayuma",
  "department": "Human Nutrition and Dietetics",
  "employment_type": "Full-time"
}
```
⚠️ Trainers have `full_name` and `short_name`, NOT `name`.

### Timetable grid (from /api/timetable/master/)
```json
{
  "grid": {
    "MON": {
      "<period_id>": [
        {
          "id": "uuid",
          "unit_name": "Communication Skills",
          "cohort": "CND JAN 26",
          "cohort_id": "uuid",
          "trainer": "Mrs Ayuma",
          "room": "HND 3"
        }
      ]
    }
  },
  "periods": [...],
  "days": ["MON","TUE","WED","THU","FRI"],
  "total_entries": 25
}
```
⚠️ `cohort` is a NAME string. `cohort_id` is the UUID. Always use `cohort_id` for comparisons.

### Trainer assignment POST
```
POST /api/curriculum/<uuid>/trainers/
{ "trainer_id": "<uuid>" }
Response: { "id": "uuid", "name": "short_name", "trainer_type": "INTERNAL", "label": "" }
```

---

## 5. TypeScript Types (types/index.ts)

### CurriculumUnit
```typescript
interface CurriculumUnit {
  id: string
  programme_code: string
  programme_id: string
  term_number: number
  position: number
  code: string
  name: string
  unit_type: string
  credit_hours: number
  periods_per_week: number
  is_outsourced: boolean
  is_active: boolean
  notes: string
  qualified_trainers: {
    id: string
    name: string
    trainer_type: string
    label: string
  }[]
}
```

### ScheduledUnit (flat shape from grid)
```typescript
interface ScheduledUnit {
  id: string
  unit_code: string; unit_name: string
  cohort: string        // NAME string
  cohort_id: string     // UUID — use this for comparisons
  trainer: string; trainer_id: string
  room: string; room_id: string; room_capacity: number
  day: DayCode
  period_label: string; period_id: string
  period_start: string; period_end: string
  sequence: number
  is_combined: boolean; combined_key: string
  status: EntryStatus
}
```

---

## 6. Global State (store/index.ts)

useAuthStore: { token, user, setAuth, logout }
useTermStore: { activeTerm, setActiveTerm }

---

## 7. Design System

Primary: #1e3a5f | Accent: #f59e0b
Sidebar: #1e3a5f bg, white text
DRAFT → amber | PUBLISHED → emerald | CANCELLED → red
INTERNAL trainer → blue badge | OUTSOURCED trainer → amber badge

---

## 8. Known Backend Behaviours

1. Pagination — some lists return { count, next, previous, results } inside data
2. Term filter required — all timetable endpoints need ?term=<id>
3. Generate takes 5-30 seconds
4. HIGH conflicts block publishing unless force=true
5. Login returns { token } NOT wrapped in envelope
6. `/api/curriculum/` requires `?programme=<uuid>` — no global listing
7. Trainer assignment DELETE requires body: `{ trainer_id: "<uuid>" }`
8. Publish 400 = already published (treat as success), 409 = conflicts (offer force)
9. Outsourced units are SKIPPED by the scheduler entirely — no trainer needed
10. `/api/curriculum-units/` does NOT exist — correct endpoint is `/api/curriculum/`
11. Cohort `programme_id` field is the UUID — `programme` field is the name string

---

## 9. Scheduler Behaviour (confirmed from engine source)

The scheduler (`TimetableEngine`) works as follows:
1. Loads all active cohorts for the institution
2. For each cohort fetches `CurriculumUnit` filtered by `programme` + `current_term` + `is_active=True`
3. **Outsourced units** (`is_outsourced=True`) are skipped entirely — marked handled, never scheduled
4. Units with **no qualified trainer** assigned → logged as `NO_TRAINER` conflict (HIGH severity)
5. Shared units (same name, same `sharing_group`) → scheduled once for all cohorts combined
6. Multi-pass: STRICT → RELAXED → EMERGENCY
7. Unplaced units → logged as `NO_ROOM` conflict (HIGH severity)

**Units on Offer page writes to `qualified_trainers` M2M via `CurriculumUnitTrainer` through model — same data the scheduler reads. No separate "units on offer" table exists.**

---

## 10. Known Issues (as of 2026-05-01)

1. **60 NO_ROOM conflicts** — units have trainers but scheduler can't find available rooms. Likely cause: not enough rooms or room capacity constraints too tight.
2. **Render DB sleep** — free tier suspends after inactivity. DB retry middleware added but first request after long pause may still be slow.
3. **Groq API key exposed** in chat — rotate at console.groq.com and update Render env var.
4. **UptimeRobot not set up** — ping `/api/terms/` every 5 min to prevent DB sleep.

---

## 11. CRITICAL PowerShell Rules

### Downloads folder unreliable — always use inline patches
```powershell
(Get-Content $f -Raw) -replace 'old', 'new' | Set-Content $f -Encoding UTF8
```

### Writing large files — use Set-Content with here-string
```powershell
Set-Content $dest -Encoding UTF8 -Value @'
...file content...
'@
```

### Append chunks
```powershell
Add-Content $dest -Encoding UTF8 -Value @'
...more content...
'@
```

### Bracket folders ([cohortId], [id])
- Always use `[System.IO.File]::WriteAllText()` for files in bracket-named dirs

### File reading with encoding issues
```powershell
python -c "
content = open('file.tsx', 'r', encoding='utf-8-sig').read()
with open('out.txt', 'w', encoding='utf-8') as f:
    f.write(content)
"
Get-Content out.txt -Encoding UTF8
```

### Patching files with JSX/special chars — use Python chr() trick
```python
old = 'text with ' + chr(34) + 'quotes' + chr(34)
new = 'replacement with ' + chr(39) + 'single quotes' + chr(39)
```

### After any file write, verify:
```powershell
Get-Content $f | Select-Object -First 5
Get-Content $f | Select-String "keyword"
```

---

## 12. Layer 15 — Remaining Work (NEXT)

### Priority 1 — Fix NO_ROOM conflicts (60 pending)
- Check room configuration — enough rooms? Correct capacity?
- Check if scheduler room matching logic is too strict
- May need to add more rooms or relax capacity constraints

### Priority 2 — Render deployment checklist
- Add `GROQ_API_KEY` to Render environment variables
- Rotate Groq API key (current one exposed in chat)
- Set up UptimeRobot to ping `/api/terms/` every 5 min

### Priority 3 — Polish pages
- app/not-found.tsx — 404 page
- app/loading.tsx — global loading spinner
- app/error.tsx — error boundary
- app/(dashboard)/schedule/page.tsx — "Coming soon" stub
- app/(dashboard)/settings/page.tsx — "Coming soon" stub

### Priority 4 — Verify sub-timetable pages
- /timetable/cohort/[cohortId]
- /timetable/trainer/[id]
- /timetable/[id] and /timetable/[id]/edit

### Priority 5 — Excel bulk upload
- Upload endpoint: POST /api/curriculum/trainers/bulk/
- Parses Excel, assigns trainers in bulk
- Frontend: upload button on curriculum page

### Priority 6 — UX improvements
- Print button on timetable pages
- Export buttons (PDF/Excel)
- Sidebar active state for sub-routes

---

## 13. GitHub Repos

- Backend: github.com:Sozi-source/timetabler-api.git (branch: main)
- Frontend: github.com:Sozi-source/timetabler.git (branch: main)

---

End of context document.
Start next session with:
**"Continue building the Timetabler frontend — Layer 15. Update the context file at the end."**