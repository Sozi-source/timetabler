# Timetabler — Frontend Context Document
> **Purpose:** Paste this at the start of every frontend chat session to restore full context instantly.
> **Last updated:** 2026-04-26
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

### Modified: types/index.ts
- Added `is_outsourced: boolean` to `CurriculumUnit` interface

### Modified: ConstraintModal
- Completely rebuilt — simplified to unit + day + period only
- No rule type selector (always PIN_DAY_PERIOD)
- Two-step fetch: programmes → curriculum units (because `/api/curriculum/` requires `?programme=<id>`)
- Fetches periods and rooms
- Hard constraint only (is_hard: true always)
- Optional preferred room field

### Excel template created
- `qualified_trainers_template.xlsx` — 3 sheets: upload template, trainers reference, instructions
- Columns: unit_code, trainer_staff_id, trainer_type, label, trainer_name (ref), unit_name (ref), notes (ref)
- **Not yet wired to an upload endpoint** — deferred

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
      timetable/page.tsx                              DONE ✓ WORKING
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
        curriculum/page.tsx                           DONE ← UPDATED
        periods/page.tsx                              DONE
        rooms/page.tsx                                DONE
        trainers/page.tsx                             DONE
        terms/page.tsx                                DONE
        cohorts/page.tsx                              DONE
      schedule/page.tsx                               STUB
      settings/page.tsx                               STUB
  components/
    layout/Sidebar.tsx                                DONE
    layout/Topbar.tsx                                 DONE
    layout/AppShell.tsx                               DONE
    features/dashboard/StatCard.tsx                   DONE
    features/dashboard/ActionButton.tsx               DONE
    features/dashboard/TermProgress.tsx               DONE
    features/timetable/EntryCard.tsx                  DONE
    features/timetable/EntryEditModal.tsx             DONE
    features/timetable/TimetableGrid.tsx              DONE
    features/conflicts/ConflictCard.tsx               DONE
    features/conflicts/ResolveModal.tsx               DONE
    features/constraints/ConstraintModal.tsx          DONE ← REBUILT (simplified)
    features/setup/SetupShell.tsx                     DONE
    features/setup/SetupTable.tsx                     DONE
    features/setup/SetupModal.tsx                     DONE
    features/curriculum/TrainerPanel.tsx              DONE ← NEW
  lib/api.ts, auth.ts, providers.tsx, utils.ts       DONE
  services/setup.ts                                  DONE
  services/timetable.ts                              DONE
  store/index.ts                                     DONE
  types/index.ts                                     DONE ← UPDATED
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

## 4. TypeScript Types (types/index.ts)

### CurriculumUnit (updated)
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
  is_outsourced: boolean          // ← NEW
  is_active: boolean
  notes: string
  qualified_trainers: {
    id: string
    name: string
    trainer_type: string          // INTERNAL | OUTSOURCED
    label: string
  }[]
}
```

### ScheduledUnit (unchanged — flat shape)
```typescript
interface ScheduledUnit {
  id: string
  unit_code: string; unit_name: string
  cohort: string; cohort_id: string
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

## 5. Global State (store/index.ts)

useAuthStore: { token, user, setAuth, logout }
useTermStore: { activeTerm, setActiveTerm }

---

## 6. Design System

Primary: #1e3a5f | Accent: #f59e0b
Sidebar: #1e3a5f bg, white text
DRAFT → amber | PUBLISHED → emerald | CANCELLED → red
INTERNAL trainer → blue badge | OUTSOURCED trainer → amber badge

---

## 7. Known Backend Behaviours

1. Pagination — some lists return { count, next, previous, results } inside data
2. Term filter required — all timetable endpoints need ?term=<id>
3. Generate takes 5-30 seconds
4. HIGH conflicts block publishing unless force=true
5. Login returns { token } NOT wrapped in envelope
6. `/api/curriculum/` requires `?programme=<id>` — no global listing
7. Trainer assignment DELETE requires body: `{ trainer_id: "<uuid>" }`
8. Publish 400 = already published (treat as success), 409 = conflicts (offer force)

---

## 8. Curriculum Page — Trainer Assignment Flow

1. User selects programme → units table loads
2. Each row has "Manage" button (light blue) in Qualified Trainers column
3. Click Manage → TrainerPanel slides in from right
4. Panel shows: assigned trainers (blue chips) + search + checkbox list of all trainers
5. Click trainer → instantly toggles assigned/unassigned (POST or DELETE)
6. For outsourced units: Edit unit → toggle "Outsourced unit" → save

---

## 9. ConstraintModal — Simplified Flow

1. Enter constraint name
2. Select curriculum unit (fetched via all programmes → all curriculum)
3. Pick day (Mon–Fri buttons)
4. Pick session (period dropdown)
5. Optional: preferred room
6. Toggle active on/off
7. Save → always PIN_DAY_PERIOD, always hard constraint

---

## 10. CRITICAL PowerShell Rules

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

### After any file write, verify:
```powershell
Get-Content $f | Select-Object -First 5
Get-Content $f | Select-String "keyword"
```

---

## 11. Layer 14 — Remaining Work (NEXT)

### Priority 1 — Polish pages
- app/not-found.tsx — 404 page
- app/loading.tsx — global loading spinner
- app/error.tsx — error boundary
- app/(dashboard)/schedule/page.tsx — "Coming soon" stub
- app/(dashboard)/settings/page.tsx — "Coming soon" stub

### Priority 2 — Scheduler: handle outsourced units
- Backend scheduler should skip trainer assignment for `is_outsourced=True` units
- Or assign a placeholder "TBD" trainer

### Priority 3 — Verify sub-timetable pages
- /timetable/cohort/[cohortId]
- /timetable/trainer/[id]
- /timetable/[id] and /timetable/[id]/edit

### Priority 4 — Excel bulk upload
- Upload endpoint: POST /api/curriculum/trainers/bulk/
- Parses Excel, assigns trainers in bulk
- Frontend: upload button on curriculum page

### Priority 5 — UX improvements
- Print button on timetable pages
- Export buttons (PDF/Excel)
- Sidebar active state for sub-routes

---

End of context document.
Start next session with:
**"Continue building the Timetabler frontend — Layer 14. Update the context file at the end."**