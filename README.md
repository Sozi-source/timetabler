# Timetabler System — Full Technical Documentation

> **Institution:** ICMHS  
> **Version:** 2.0 (May 2026)  
> **Stack:** Django 6 + DRF (backend) · Next.js 16 + React (frontend)  
> **Author:** Sozi Development Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Scheduling Engine](#4-scheduling-engine)
5. [Backend API Reference](#5-backend-api-reference)
6. [Frontend Guide](#6-frontend-guide)
7. [Operational Workflows](#7-operational-workflows)
8. [Maintenance & Tools](#8-maintenance--tools)
9. [Known Constraints & Edge Cases](#9-known-constraints--edge-cases)
10. [Deployment](#10-deployment)

---

## 1. System Overview

The Timetabler is a **constraint-based academic timetabling system** designed for TVET colleges. It automatically schedules cohorts of students into rooms with qualified trainers while respecting hard and soft constraints.

### Core Capabilities

- **Automated generation** — constraint-based multi-pass scheduler places all units in a single click
- **Combined sessions** — units shared across programmes (e.g. CHN and DHN) are scheduled once for all cohorts simultaneously
- **Conflict detection** — unplaceable units surface as conflicts with clear reasons
- **Manual override** — any scheduled entry can be edited post-generation
- **Progression tracking** — cohorts advance through terms with unit completion records
- **Multi-programme support** — CHN, DHN, DHNT, CND, DND all managed concurrently

### Terminology

| Term | Meaning |
|------|---------|
| **Cohort** | A group of students on a programme, e.g. "CND JAN 26" |
| **CurriculumUnit** | One subject at a specific term position in a programme |
| **ScheduledUnit** | One row in the timetable — cohort × unit × trainer × room × day × period |
| **Term** | An academic semester (e.g. ICMHS – SEM 1) |
| **Period** | A named time block (e.g. Morning Session 08:00–10:00) |
| **Constraint** | A scheduling rule — hard (must) or soft (try) |
| **Sharing group** | Programmes that share units and are scheduled together |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  Dashboard · Timetable Grid · Conflicts · Setup · Trainer View  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JSON)
                             │ Token Auth
┌────────────────────────────▼────────────────────────────────────┐
│                     Backend (Django + DRF)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  views.py    │  │ scheduler.py │  │     models.py        │  │
│  │  REST API    │  │  Engine      │  │  ORM + Migrations    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     PostgreSQL Database                          │
└─────────────────────────────────────────────────────────────────┘
```

### File Map

```
timetabler/                          ← Django project root
├── timetabler/
│   ├── settings.py                  ← DB config, keepalives, middleware
│   ├── urls.py                      ← Root URL routing
│   └── db_retry_middleware.py       ← Auto-retry on DB timeout (3×)
└── timetable/
    ├── models.py                    ← All data models
    ├── views.py                     ← All REST endpoints
    ├── urls.py                      ← URL patterns
    ├── scheduler.py                 ← TimetableEngine + Placer
    ├── serializers.py               ← DRF input validation
    ├── ai_views.py                  ← AI chat endpoint (Groq)
    ├── admin.py                     ← Django admin registration
    └── migrations/                  ← Database migrations

fe-timetable/                        ← Next.js frontend root
├── app/
│   ├── (auth)/login/                ← Login page
│   └── (dashboard)/
│       ├── dashboard/               ← Main dashboard
│       ├── timetable/               ← Master grid + sub-views
│       ├── conflicts/               ← Conflict resolution
│       ├── constraints/             ← Constraint management
│       └── setup/                   ← All CRUD setup pages
├── components/
│   ├── layout/                      ← Sidebar, Topbar, AppShell
│   └── features/                    ← Domain-specific components
├── hooks/                           ← TanStack Query hooks
├── services/                        ← API call functions
├── store/                           ← Zustand global state
└── types/                           ← TypeScript interfaces
```

---

## 3. Data Models

### Institution

The top-level tenant. All data belongs to an institution.

| Field | Type | Notes |
|-------|------|-------|
| `name` | CharField | e.g. "ICMHS" |
| `days_of_week` | JSONField | `["MON","TUE","WED","THU","FRI"]` |
| `max_periods_per_day` | IntegerField | Default 4 |
| `allow_back_to_back` | BooleanField | Whether consecutive trainer periods are allowed |

### Department → Programme → CurriculumUnit

```
Department
  └── Programme  (code, total_terms, sharing_group)
        └── CurriculumUnit  (code, term_number, periods_per_week, is_outsourced)
              └── qualified_trainers M2M → Trainer (via CurriculumUnitTrainer)
```

**CurriculumUnit key fields:**

| Field | Type | Notes |
|-------|------|-------|
| `term_number` | IntegerField | Which term of the programme (1-based) |
| `periods_per_week` | IntegerField | 1 = single, 2 = split sessions on different days |
| `is_outsourced` | BooleanField | External lecturer — scheduler skips trainer assignment |
| `qualified_trainers` | M2M | Through `CurriculumUnitTrainer` with `trainer_type` label |

**Programme.sharing_group:** Set the same string on programmes that share units (e.g. `"ICMHS_NUTRITION"`). The scheduler will combine those units into a single session serving all cohorts.

### Cohort

Represents a student intake group.

| Field | Type | Notes |
|-------|------|-------|
| `name` | CharField | e.g. "CND JAN 26" |
| `start_year` | IntegerField | 2026 |
| `start_month` | IntegerField | 1 (January) |
| `current_term` | IntegerField | Which programme term they are in right now |
| `student_count` | IntegerField | Used for room capacity matching |

**Computed properties:**
- `computed_current_term` — calendar-based calculation (months elapsed ÷ 4)
- `term_is_synced` — whether `current_term` matches calendar
- `advance_term()` — increments `current_term` by 1, capped at `programme.total_terms`

### Trainer

| Field | Type | Notes |
|-------|------|-------|
| `employment_type` | Choice | FT/PT/VS/CT |
| `max_periods_per_week` | IntegerField | Scheduler hard limit |
| `available_days` | JSONField | Empty = all days (for FT staff) |

### TrainerAvailability

Per-term blocking of specific days or periods. `is_available=False` = blocked. The scheduler reads this before assigning any slot.

### ScheduledUnit

The master timetable template — one row per scheduled session.

| Field | Type | Notes |
|-------|------|-------|
| `status` | Choice | DRAFT / PUBLISHED / CANCELLED |
| `is_combined` | BooleanField | True if multiple cohorts share this session |
| `combined_key` | CharField | Links combined rows across cohorts |
| `sequence` | IntegerField | 0=single, 1=first of pair, 2=second of pair |

**Unique constraints (PUBLISHED only):** No trainer, cohort, or room can appear twice in the same slot.

### Constraint

Scheduling rules stored as data.

| Rule | Parameters | Effect |
|------|-----------|--------|
| `PIN_DAY_PERIOD` | `{day, period_id}` | Unit must be on this exact slot |
| `PIN_DAY` | `{day}` | Unit must be on this day |
| `AVOID_DAY` | `{day}` | Soft: prefer not this day |
| `AVOID_PERIOD` | `{period_id}` | Soft: prefer not this period |
| `PREFERRED_ROOM` | `{room_id}` | Try this room first |
| `MAX_DAILY_PERIODS` | `{max}` | Cohort max periods per day |

### Conflict

Created automatically during generation for unplaceable units.

| Type | Meaning |
|------|---------|
| `NO_TRAINER` | Unit has no qualified trainer assigned |
| `NO_ROOM` | Trainer available but no free room slot found |
| `TRAINER_CLASH` | Double-booking detected |
| `COHORT_CLASH` | Cohort scheduled twice in same slot |

Resolution statuses: `PENDING → RESOLVED / OVERRIDDEN / IGNORED`

### AuditLog

Immutable. Every generate, publish, delete, and edit is recorded with before/after payload.

---

## 4. Scheduling Engine

The engine lives in `timetable/scheduler.py` and is invoked by `TimetableEngine(term).run()`.

### Pipeline

```
Step 0  Wipe existing DRAFTs + Conflicts for the term
Step 1  Load institution data (days, periods, rooms, trainers)
Step 2  Build work queue — one list of CurriculumUnits per cohort
Step 3  Schedule COMBINED sessions first (shared classes)
   3a  Hard-pinned combined sessions
   3b  Remaining combined sessions
Step 4  Sort remaining individual units by difficulty (hardest first)
Step 5  STRICT pass — all constraints enforced
Step 6  RELAXED pass — soft constraints ignored
Step 7  EMERGENCY pass — trainer overlap allowed, cohort NEVER overlaps
Step 8  Unplaced units → Conflict records
Step 9  bulk_create all ScheduledUnit rows (deduplicated)
```

### OccupancyGrid

In-memory O(1) availability tracker. Tracks:
- `trainer_busy[trainer_id]` → set of `(day, period_id)` slots occupied
- `cohort_busy[cohort_id]` → same
- `room_busy[room_id]` → same
- `trainer_week_periods[trainer_id]` → integer count for load balancing

All mutations go through `mark()` / `unmark()` to keep counts consistent.

### Difficulty Sort

Units are sorted hardest-first before placement passes. Difficulty is determined by:
1. Units with ≤1 qualified trainer (scarce trainers first)
2. Units with hard pins (fewest slot options)
3. Units needing most sessions
4. Units with fewest average qualified trainers
5. Units needing double/split sessions

### Trainer Selection

Within each slot attempt, trainers are sorted lightest-loaded first (`trainer_week_periods`). The first trainer who:
- Is available that day
- Is not blocked (TrainerAvailability)
- Is not already busy in that slot (STRICT/RELAXED) or allowed to overlap (EMERGENCY)
- Has not exceeded `max_periods_per_week`

...gets assigned.

### Room Selection

Four-pass fallback:
1. Correct room type + sufficient capacity + free slot
2. Outsourced fallback — any free room
3. Any room with sufficient capacity (ignore type)
4. Any free room regardless of capacity

### Combined Sessions

When two or more cohorts share a unit (same name, same `sharing_group`, same `current_term`):
- A single session is placed once
- `is_combined=True` and a shared `combined_key` are set
- All cohort slots are blocked simultaneously
- One `ScheduledUnit` row per cohort pointing to the same trainer/room/slot

### Session Patterns

| `periods_per_week` | Behaviour |
|--------------------|-----------|
| 1 | Single session — placed on one day |
| 2+ with pins | Split — each session on a different day, pins honoured first |
| 2 with `session_pattern=BLOCK` | Double — two consecutive periods same day |

### Post-Generation Tools

After generation, two scripts are available for maintenance:

**`fix_and_clear.py`** — Places any units the scheduler left short, then clears stale conflict records. Run after every Generate.

**`validate_timetable.py`** — Interactive pre-generation validator. Checks for:
- Units with no qualified trainer
- Single-trainer bottlenecks (trainer exhausted)
- Trainer overload
- Room capacity issues
- Cohort slot sufficiency
- Existing clashes

**`check_clashes.py`** — Post-generation audit. Verifies zero cohort/trainer/room clashes.

### Engine Performance (Current)

| Metric | Value |
|--------|-------|
| Cohorts scheduled | 13 |
| Sessions placed (after fix_and_clear) | 117/117 |
| Clash rate | 0% |
| Conflicts remaining | 0 |
| Engine self-placement rate | ~75% |
| fix_and_clear completion | ~25% |

---

## 5. Backend API Reference

All endpoints: `http://localhost:8000/api/`  
Auth: `Authorization: Token <token>`  
Response envelope: `{ "ok": true, "data": {...} }` or `{ "ok": false, "error": "..." }`

### Authentication

```
POST /api/auth/login/
Body: { "username": "...", "password": "..." }
Response: { "token": "..." }

GET /api/auth/me/
Response: { "id", "username", "first_name", "last_name", "email", "role" }
```

### Institution & Setup

```
GET  /api/institution/
GET  /api/departments/
POST /api/departments/                    { code, name, hod }
GET  /api/departments/<uuid>/
PUT  /api/departments/<uuid>/
DEL  /api/departments/<uuid>/

GET  /api/programmes/
POST /api/programmes/                     { department_id, code, name, level, total_terms, sharing_group }
GET  /api/programmes/<uuid>/
PUT  /api/programmes/<uuid>/
DEL  /api/programmes/<uuid>/

GET  /api/curriculum/?programme=<uuid>&term_number=<n>
GET  /api/curriculum/<uuid>/
PUT  /api/curriculum/<uuid>/              { code, name, periods_per_week, is_outsourced, ... }
GET  /api/curriculum/<uuid>/trainers/
POST /api/curriculum/<uuid>/trainers/     { trainer_id, trainer_type?, label? }
DEL  /api/curriculum/<uuid>/trainers/     { trainer_id }   ← body required

GET  /api/periods/
POST /api/periods/                        { label, start_time, end_time, is_break }
GET  /api/periods/<int>/
PUT  /api/periods/<int>/
DEL  /api/periods/<int>/

GET  /api/rooms/
POST /api/rooms/                          { code, name, room_type, capacity, building }
GET  /api/rooms/<uuid>/
PUT  /api/rooms/<uuid>/
DEL  /api/rooms/<uuid>/

GET  /api/trainers/
POST /api/trainers/                       { department_id, first_name, last_name, email, staff_id, ... }
GET  /api/trainers/<uuid>/
PUT  /api/trainers/<uuid>/
DEL  /api/trainers/<uuid>/
GET  /api/trainers/<uuid>/availability/?term=<uuid>
POST /api/trainers/<uuid>/availability/   { day, period_id, is_available, reason }

GET  /api/terms/
POST /api/terms/                          { name, start_date, end_date, teaching_weeks, is_current }
GET  /api/terms/<uuid>/
PUT  /api/terms/<uuid>/
DEL  /api/terms/<uuid>/
```

### Cohorts & Progression

```
GET  /api/cohorts/
POST /api/cohorts/                        { programme_id, name, start_year, start_month, student_count }
GET  /api/cohorts/<uuid>/
PUT  /api/cohorts/<uuid>/
DEL  /api/cohorts/<uuid>/

GET  /api/cohorts/<uuid>/progress/
POST /api/cohorts/<uuid>/advance/         → increments current_term by 1
POST /api/cohorts/<uuid>/progress/update/ { unit_id, status, score? }

GET  /api/term/advance-all/?term=<uuid>   → preview of semester move
POST /api/term/advance-all/
     { term_id, phase: "preview" }        → returns cohorts + units_to_complete
     { term_id, phase: "confirm", overrides: { "<unit_id>": false } }
                                          → marks units complete + advances all cohorts
```

### Timetable Generation

```
POST /api/timetable/generate/             { term_id }
     → Wipes DRAFTs, runs engine, returns summary
     → Takes 5–30 seconds (use 300s timeout)

POST /api/timetable/publish/              { term_id, force?: bool }
     → Promotes DRAFT → PUBLISHED
     → 409 if HIGH conflicts pending (pass force=true to override)
     → 400 if already published (treat as success)

DEL  /api/timetable/drafts/               { term_id }
     → Deletes all DRAFT entries for term
```

### Timetable Reading

```
GET /api/timetable/master/?term=<uuid>&status=DRAFT|PUBLISHED
Response:
{
  "term": "SEM 1",
  "days": ["MON","TUE","WED","THU","FRI"],
  "periods": [{ "id", "label", "start", "end", "order", "is_break" }],
  "total_entries": 117,
  "grid": {
    "MON": {
      "<period_id>": [
        {
          "id", "unit_code", "unit_name",
          "cohort": "name_string",   ← string, NOT object
          "cohort_id": "uuid",       ← use this for filtering
          "trainer", "trainer_id",
          "room", "room_id",
          "day", "period_label",
          "is_combined", "combined_key", "status"
        }
      ]
    }
  }
}

GET /api/timetable/cohort/<uuid>/?term=<uuid>
GET /api/timetable/trainer/<uuid>/?term=<uuid>
GET /api/timetable/entry/<uuid>/
PUT /api/timetable/entry/<uuid>/          { trainer_id?, room_id?, day?, period_id?, notes? }
DEL /api/timetable/entry/<uuid>/
```

### Conflicts & Constraints

```
GET  /api/conflicts/?term=<uuid>&status=PENDING
POST /api/conflicts/<uuid>/resolve/       { note, method: "RESOLVED"|"OVERRIDDEN"|"IGNORED" }

GET  /api/constraints/?unit=<uuid>&cohort=<uuid>&trainer=<uuid>
POST /api/constraints/                    { scope, rule, is_hard, curriculum_unit?, cohort?,
                                           trainer?, room?, parameters }
PUT  /api/constraints/<uuid>/
DEL  /api/constraints/<uuid>/
```

### Exports & Dashboard

```
GET /api/export/master/?term=<uuid>       → HTML file download
GET /api/export/trainer/<uuid>/?term=<uuid>
GET /api/export/cohort/<uuid>/?term=<uuid>

GET /api/dashboard/
GET /api/dashboard/trainer/               → For logged-in trainer (requires trainer_profile link)
```

### AI Chat

```
POST /api/ai/chat/
Body: { "messages": [{ "role": "user"|"assistant", "content": "..." }], "term_id": "<uuid>" }
Model: Groq Llama 3.3 70B
System prompt: auto-built with live timetable state (conflicts, trainer loads, room availability)
```

---

## 6. Frontend Guide

### Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 16.2.4 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Data | TanStack Query v5 |
| HTTP | Axios with token interceptors |
| State | Zustand (`useAuthStore`, `useTermStore`) |
| Icons | Lucide React |
| Toasts | sonner |

### Global State

```typescript
// Auth
useAuthStore() → { token, user, setAuth, logout }

// Active term (selected in Topbar)
useTermStore() → { activeTerm, setActiveTerm }
```

### API Client (`lib/api.ts`)

All requests go through Axios. The interceptor automatically:
- Adds `Authorization: Token <token>` header
- Unwraps `response.data.data` on success
- Redirects to `/login` on 401

### Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview stats, trainer workload, recent activity |
| `/timetable` | Master grid with generate/publish/clear controls |
| `/timetable/cohort/[cohortId]` | Single cohort timetable |
| `/timetable/trainer/[id]` | Single trainer timetable |
| `/conflicts` | Conflict list + resolve modal |
| `/constraints` | Constraint management |
| `/setup/institution` | Institution settings |
| `/setup/departments` | Department CRUD |
| `/setup/programmes` | Programme CRUD |
| `/setup/curriculum` | Curriculum units + trainer assignment |
| `/setup/units-on-offer` | Per-cohort trainer assignment view |
| `/setup/periods` | Period CRUD |
| `/setup/rooms` | Room CRUD |
| `/setup/trainers` | Trainer CRUD |
| `/setup/terms` | Term CRUD |
| `/setup/cohorts` | Cohort CRUD |

### Key Component: TimetableGrid

**Location:** `components/features/timetable/TimetableGrid.tsx`

Renders the grid from the master timetable API response. Each cell shows an `EntryCard`. Supports filtering by cohort (uses `cohort_id` field, not `cohort` string).

⚠️ **Critical:** The API returns `cohort` as a display name string and `cohort_id` as the UUID. Always use `cohort_id` for comparisons and filtering.

### Key Component: TimetablePage Generate Flow

The Generate button uses a retry loop (up to 3 attempts, 5-minute timeout per attempt):

```
User clicks Generate
  → POST /api/timetable/generate/
  → Show progress bar (submitting → waiting → done/failed)
  → On success: invalidate master timetable + conflicts + dashboard queries
  → Show result summary (placed count, completion rate, conflicts)
```

### Validate Pre-Flight (new in Layer 15)

Before calling `/api/timetable/generate/`, the frontend calls `/api/timetable/validate/`. If issues are found, a modal shows:
- Units with no trainer (blocking)
- Single-trainer bottlenecks (warning)
- Trainer overload (warning)
- Room capacity gaps (warning)

User can choose: **Fix issues first** (dismisses) or **Generate anyway** (proceeds).

### Cohort/Unit Field Mapping

```typescript
// From /api/cohorts/
cohort.id           // UUID — use for API calls
cohort.programme    // "CERTIFICATE IN NUTRITION" — display only
cohort.programme_id // UUID — use for /api/curriculum/?programme=<this>
cohort.current_term // integer — use for /api/curriculum/?term_number=<this>

// From /api/timetable/master/ grid entries
entry.cohort        // "CND JAN 26" — display only
entry.cohort_id     // UUID — use for filtering
entry.trainer       // "Mrs Ayuma" — display only
entry.trainer_id    // UUID — use for API calls
```

### Design System

```
Primary colour:   #1e3a5f  (dark navy)
Accent:           #f59e0b  (amber)
Sidebar bg:       #1e3a5f
Success/Published: emerald-600
Draft:            amber-600
Error:            red-600
```

---

## 7. Operational Workflows

### Standard Timetable Generation Workflow

```
1. Setup (one-time)
   ├── Configure institution, departments, programmes
   ├── Add curriculum units per programme per term
   ├── Assign qualified trainers to each unit
   └── Add rooms, periods, trainers

2. Each semester
   ├── Create a new Term record and mark is_current=True
   ├── Run: python validate_timetable.py  ← fix data issues
   ├── Click Generate in the UI
   ├── Run: python fix_and_clear.py       ← resolve any shorts
   ├── Run: python check_clashes.py       ← verify zero clashes
   ├── Review conflicts in UI
   └── Click Publish

3. Ongoing
   └── Edit individual entries via PUT /api/timetable/entry/<uuid>/
```

### Move Semester (Advance All Cohorts)

```
1. End of term — click "Move Semester" button in UI
2. System previews: for each cohort, which units will be marked COMPLETE
3. Coordinator reviews — can uncheck any unit to skip completion
4. Confirm — system atomically:
   ├── Creates ProgressRecord(status=COMPLETED) for each unit
   └── Calls cohort.advance_term() on each active cohort
5. Next timetable generation uses the new current_term automatically
```

**API calls:**
```
GET  /api/term/advance-all/?term=<uuid>       → preview
POST /api/term/advance-all/
     { term_id, phase: "confirm", overrides: { "<unit_id>": false } }
```

### Conflict Resolution

```
Conflict appears in UI → Coordinator clicks "Resolve"
→ Chooses: Resolved / Overridden / Ignored
→ Adds resolution note
→ Conflict clears from pending list
→ If all HIGH conflicts resolved → Publish button unlocks
```

### Trainer Availability Management

```
Admin marks trainer unavailable:
  POST /api/trainers/<uuid>/availability/
  { day: "MON", period_id: "<uuid>", is_available: false, reason: "LEAVE" }

Scheduler reads all is_available=False records and skips those slots.
Full-day block: POST with period_id=null → blocks entire day.
```

---

## 8. Maintenance & Tools

### Shell Scripts (run from timetabler/ directory)

| Script | When to run | What it does |
|--------|-------------|--------------|
| `validate_timetable.py` | Before Generate | Interactive check of all data issues |
| `fix_and_clear.py` | After Generate | Places missed sessions, clears stale conflicts |
| `check_clashes.py` | After fix_and_clear | Verifies zero clashes |
| `patch_scheduler.py` | One-time setup | Applied 4 scheduler bug fixes |

### Database Maintenance

```powershell
# Check placement state
python manage.py shell --no-imports -c "
from timetable.models import Cohort, Term, ScheduledUnit, CurriculumUnit
term = Term.objects.filter(is_current=True).first()
for c in Cohort.objects.filter(is_active=True).order_by('name'):
    units = CurriculumUnit.objects.filter(programme=c.programme, term_number=c.current_term, is_active=True)
    exp = sum(u.periods_per_week for u in units)
    placed = ScheduledUnit.objects.filter(cohort=c, term=term, status='DRAFT').count()
    print(f'{c.name:20} {placed:3}/{exp:3}  {\"OK\" if placed>=exp else f\"SHORT {exp-placed}\"}')"

# Check trainer loads
python manage.py shell --no-imports -c "
from timetable.models import Trainer, ScheduledUnit, Term
term = Term.objects.filter(is_current=True).first()
for t in Trainer.objects.filter(institution=term.institution, is_active=True):
    n = ScheduledUnit.objects.filter(term=term, trainer=t, status='DRAFT').count()
    print(f'{t.first_name} {t.last_name}: {n} sessions')"
```

### Adding a Trainer to a Unit (shell)

```powershell
python manage.py shell --no-imports -c "
from timetable.models import CurriculumUnit, Trainer
trainer = Trainer.objects.filter(last_name='Osozi').first()
unit = CurriculumUnit.objects.filter(code='DHN3105').first()
unit.qualified_trainers.add(trainer)
print('Done')"
```

### Marking a Unit Outsourced (shell)

```powershell
python manage.py shell --no-imports -c "
from timetable.models import CurriculumUnit
CurriculumUnit.objects.filter(code='CCU1110').update(is_outsourced=True)
print('Done')"
```

---

## 9. Known Constraints & Edge Cases

### Trainer Exhaustion

The most common cause of remaining shorts. Occurs when a trainer is the only one qualified for a unit but their week is already full from other assignments.

**Resolution options:**
1. Add a second qualified trainer in admin → re-run Generate
2. Mark the unit outsourced if an external lecturer covers it
3. Manually place the session via `PUT /api/timetable/entry/<uuid>/` after generation

### Single-Trainer Bottleneck

If only one trainer qualifies for a unit, the difficulty sort prioritises that unit early. However, if the trainer is also assigned to many other units, exhaustion can still occur.

**Prevention:** Run `validate_timetable.py` before Generate. Check 2 (Single-trainer bottlenecks) will flag these.

### Combined Sessions Matching

Units are combined when:
- Same `name` (exact string match)
- Cohorts are in the same `Programme.sharing_group`
- Cohorts are at the same `current_term`

If names differ by even one character, units will not be combined. Use the curriculum admin to ensure names are identical.

### Outsourced Units with `periods_per_week > 1`

These are placed without a trainer across multiple days. The scheduler handles this correctly after the patch applied in May 2026.

### Hard Pins on Busy Slots

A PIN_DAY_PERIOD constraint on a slot that is already occupied by a combined session will be skipped (not fatal — scheduler falls back to a free slot). If a pin is truly essential, ensure the slot is free in the combined session pass first.

### Publish Deduplication

The publish step removes duplicate DRAFT rows (same cohort/trainer/room × day × period) before promoting to PUBLISHED. Combined sessions are exempt from deduplication since they legitimately share trainer/room slots across cohorts.

---

## 10. Deployment

### Environment Variables

| Variable | Used by | Notes |
|----------|---------|-------|
| `DATABASE_URL` | Django | Render PostgreSQL connection string |
| `GROQ_API_KEY` | ai_views.py | Rotate at console.groq.com if exposed |
| `SECRET_KEY` | Django | Change in production |
| `ALLOWED_HOSTS` | Django | Add Render domain |
| `DEBUG` | Django | Set to `False` in production |

### Render (Backend)

- Free tier PostgreSQL suspends after inactivity → first request after pause is slow
- DB retry middleware (3× with exponential backoff) handles this automatically
- Set up UptimeRobot to ping `/api/terms/` every 5 minutes to prevent suspension

### Local Development

```powershell
# Start backend
cd C:\Users\sozi\Desktop\2026-projects\Timetable\timetabler
python manage.py runserver

# Start frontend
cd fe-timetable
npm run dev
```

### GitHub

- Backend: `github.com:Sozi-source/timetabler-api.git` (branch: main)
- Frontend: `github.com:Sozi-source/timetabler.git` (branch: main)

---

*Documentation generated May 2026 · Timetabler v2.0*