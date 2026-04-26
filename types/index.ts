// ── Base ──────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Institution ───────────────────────────────────────────────────────────
export interface Institution {`n  code?: string;`n  logo_url?: string;
  id: string;
  name: string;
  short_name: string;
  country: string;
  timezone: string;
  days_of_week: string[];
  allow_back_to_back: boolean;
  max_periods_per_day: number;
}

// ── Department ────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  code: string;
  name: string;
  hod: string;
  email: string;
  is_active: boolean;
  institution_id: string;   // UUID — used when creating/editing trainers
}

// ── Programme ─────────────────────────────────────────────────────────────
export type ProgrammeLevel =
  | 'CERT' | 'DIP' | 'HDIP' | 'DEG'
  | 'PG_DIP' | 'MASTERS' | 'PHD' | 'OTHER';

export interface Programme {`n  duration_terms?: number;`n  nqf_level?: number;
  id: string;
  code: string;
  name: string;
  level: string;            // display value e.g. "Diploma"
  department: string;       // string representation e.g. "ICT – Computer Science"
  department_id: string;    // UUID — for write operations
  total_terms: number;
  sharing_group: string;
  is_active: boolean;
}

// ── CurriculumUnit ────────────────────────────────────────────────────────
export type UnitType = 'CORE' | 'ELECTIVE' | 'PRACTICAL' | 'PROJECT';

export interface CurriculumUnit {
  id: string;
  programme_code: string;
  programme_id: string;     // UUID — for write operations
  term_number: number;
  position: number;
  code: string;
  name: string;
  unit_type: string;        // display value e.g. "Core"
  credit_hours: number;
  periods_per_week: number;
  is_outsourced: boolean;
  is_active: boolean;
  notes: string;
  qualified_trainers: { id: string; name: string }[];
}

// ── Period ────────────────────────────────────────────────────────────────
export interface Period {`n  start?: string;`n  end?: string;`n  duration?: number;
  id: string;
  institution: string;      // UUID
  label: string;
  start_time: string;       // "08:00:00"
  end_time: string;         // "09:00:00"
  order: number;
  is_break: boolean;
  duration_hours: number;
}

// ── Room ──────────────────────────────────────────────────────────────────
export type RoomType =
  | 'CLASSROOM' | 'LAB' | 'COMPUTER' | 'CLINICAL'
  | 'WORKSHOP'  | 'SEMINAR' | 'HALL' | 'ONLINE' | 'OTHER';

export interface Room {
  id: string;
  institution: string;      // UUID
  code: string;
  name: string;
  room_type: RoomType;
  room_type_display: string;
  capacity: number;
  building: string;
  floor: number;
  is_active: boolean;
  features: string[];
}

// ── Term ──────────────────────────────────────────────────────────────────
export interface Term {
  id: string;
  institution: string;      // UUID
  name: string;
  start_date: string;       // "2026-01-06"
  end_date: string;
  teaching_weeks: number;
  is_current: boolean;
  week_number: number;
  weeks_remaining: number;
}

// ── Trainer ───────────────────────────────────────────────────────────────
export type EmploymentType = 'FT' | 'PT' | 'VS' | 'CT';

export interface Trainer {
  id: string;
  staff_id: string;
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  // Read serializer returns these as display strings
  department: string;           // e.g. "ICT – Computer Science"
  employment_type: string;      // display e.g. "Full-time"
  // These are NOT returned by the read serializer — needed for write operations
  // Derive department_id by matching dept name from the departments list
  department_id?: string;       // UUID — populate from departments list on edit
  institution_id?: string;      // UUID — populate from departments list on edit
  employment_type_code?: EmploymentType; // raw code — derive from employment_type display
  max_periods_per_week: number;
  is_outsourced: boolean;
  available_days: string[];
  is_active: boolean;
}

// ── Cohort ────────────────────────────────────────────────────────────────
export interface CohortProgress {
  total: number;
  completed: number;
  in_progress: number;
  remaining: number;
  percentage: number;
}

export interface Cohort {
  id: string;
  name: string;
  programme: string;        // string representation
  programme_id?: string;    // UUID — for write operations
  start_year: number;
  start_month: number;
  current_term: number;
  student_count: number;
  is_active: boolean;
  progress: CohortProgress;
}

// ── ScheduledUnit (Timetable Entry) ───────────────────────────────────────
export type EntryStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface ScheduledUnit {
  id: string;
  term: string;
  cohort: string;
  cohort_name: string;
  curriculum_unit: string;
  unit_code: string;
  unit_name: string;
  trainer: string;
  trainer_name: string;
  room: string;
  room_code: string;
  day: DayCode;
  period: string;
  period_label: string;
  sequence: number;         // 0=single, 1=first of pair, 2=second of pair
  is_combined: boolean;
  combined_key: string;
  status: EntryStatus;
  published_at: string | null;
  notes: string;
}

// ── Conflict ──────────────────────────────────────────────────────────────
export type ConflictSeverity   = 'HIGH' | 'MEDIUM' | 'LOW';
export type ResolutionStatus   = 'PENDING' | 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED';

export interface Conflict {
  id: string;
  term: string;
  conflict_type: string;
  severity: ConflictSeverity;
  description: string;
  cohort: string | null;
  cohort_name: string | null;
  trainer: string | null;
  trainer_name: string | null;
  room: string | null;
  room_code: string | null;
  curriculum_unit: string | null;
  unit_code: string | null;
  resolution_status: ResolutionStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string;`n  involved_entries?: string[];
  created_at: string;
}

// ── Constraint ────────────────────────────────────────────────────────────
export type ConstraintScope = 'UNIT' | 'TRAINER' | 'ROOM' | 'COHORT';
export type ConstraintRule  =
  | 'PIN_DAY_PERIOD' | 'PIN_DAY' | 'PREFERRED_ROOM'
  | 'AVOID_DAY' | 'AVOID_PERIOD' | 'BACK_TO_BACK' | 'MAX_PER_DAY';

export interface Constraint {
  id: string;
  scope: ConstraintScope;
  rule: ConstraintRule;
  is_hard: boolean;
  curriculum_unit: string | null;
  trainer: string | null;
  room: string | null;
  cohort: string | null;
  parameters: Record<string, unknown>;
  is_active: boolean;
  notes: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardData {
  term: Term | null;
  total_cohorts: number;
  total_trainers: number;
  total_rooms: number;
  scheduled_units: number;
  published_units: number;
  pending_conflicts: number;
  week_number: number;
  weeks_remaining: number;
}

export interface TrainerDashboardData {
  trainer: Trainer;
  term: Term | null;
  scheduled_count: number;
  timetable: ScheduledUnit[];
}

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  username: string;
  email: string;
  is_staff: boolean;
  groups: string[];
}

// ── Query Keys ────────────────────────────────────────────────────────────
export const queryKeys = {
  institution:    ['institution']  as const,
  departments:    ['departments']  as const,
  programmes:     ['programmes']   as const,
  curriculum:     (progId: string, term?: number) => ['curriculum', progId, term] as const,
  periods:        ['periods']      as const,
  rooms:          ['rooms']        as const,
  trainers:       ['trainers']     as const,
  terms:          ['terms']        as const,
  cohorts:        ['cohorts']      as const,
  constraints:    ['constraints']  as const,
  dashboard:      ['dashboard']    as const,
  trainerDash:    ['dashboard', 'trainer'] as const,
  masterTT:       (termId: string) => ['timetable', 'master', termId] as const,
  cohortTT:       (cohortId: string, termId: string) => ['timetable', 'cohort', cohortId, termId] as const,
  trainerTT:      (trainerId: string, termId: string) => ['timetable', 'trainer', trainerId, termId] as const,
  conflicts:      (termId: string) => ['conflicts', termId] as const,
  cohortProgress: (cohortId: string) => ['cohorts', cohortId, 'progress'] as const,
  availability:   (trainerId: string) => ['trainers', trainerId, 'availability'] as const,
} as const;

// ── Display Helpers ───────────────────────────────────────────────────────
export const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday',  WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',  SUN: 'Sunday',
};

export const DAY_SHORT: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed',
  THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

// Maps employment_type display string → code for form pre-fill
export const EMPLOYMENT_TYPE_CODE: Record<string, EmploymentType> = {
  'Full-time': 'FT',
  'Part-time': 'PT',
  'Visiting':  'VS',
  'Contract':  'CT',
};
