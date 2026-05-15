'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, ArrowRight, BookOpen, CheckCircle2, Clock,
  CalendarDays, TrendingUp, Layers, AlertCircle, Sparkles,
} from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  // Top half — Teal
  tealSolid:   '#0d9488',
  tealLight:   '#2dd4bf',
  tealDark:    '#0f766e',

  // Bottom half — Deep indigo
  indigoBg:    '#1e1b4b',
  indigoLight: 'rgba(255,255,255,0.07)',

  white:       '#ffffff',

  // Glass layers (on teal)
  glass10:     'rgba(255,255,255,0.10)',
  glass14:     'rgba(255,255,255,0.14)',
  glass18:     'rgba(255,255,255,0.18)',
  glass22:     'rgba(255,255,255,0.22)',
  glass28:     'rgba(255,255,255,0.28)',

  // Glass layers (on indigo)
  indGlass07:  'rgba(255,255,255,0.07)',
  indGlass10:  'rgba(255,255,255,0.10)',
  indGlass12:  'rgba(255,255,255,0.12)',
  indGlass18:  'rgba(255,255,255,0.18)',

  // Text on teal
  textPrimary: 'rgba(255,255,255,1.00)',
  textSecond:  'rgba(255,255,255,0.88)',
  textMuted:   'rgba(255,255,255,0.72)',
  textFaint:   'rgba(255,255,255,0.55)',

  // Text on indigo
  textFaintInd: 'rgba(255,255,255,0.45)',
  textMutedInd: 'rgba(255,255,255,0.55)',

  // Semantic chips
  emerald:     'rgba(52,211,153,0.22)',
  emeraldBrd:  'rgba(52,211,153,0.40)',
  emeraldDot:  '#34d399',
  amber:       'rgba(251,191,36,0.22)',
  amberBrd:    'rgba(251,191,36,0.38)',
  amberDot:    '#fbbf24',
  slate:       'rgba(148,163,184,0.18)',
  slateBrd:    'rgba(148,163,184,0.28)',
  slateDot:    '#94a3b8',

  // Teal accents for indigo section
  tealAccent12: 'rgba(45,212,191,0.12)',
  tealAccent24: 'rgba(45,212,191,0.24)',
  tealAccent26: 'rgba(45,212,191,0.26)',
  tealAccentTxt: 'rgba(45,212,191,0.75)',

  // Amber accents for indigo section
  amberAccent12: 'rgba(251,191,36,0.12)',
  amberAccent22: 'rgba(251,191,36,0.22)',
  amberAccent26: 'rgba(251,191,36,0.26)',
  amberAccentTxt: 'rgba(251,191,36,0.75)',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Progress arc (teal section) ────────────────────────────────────────────────
function ProgressArc({ pct, size = 82 }: { pct: number; size?: number }) {
  const strokeW = 6
  const r    = (size - strokeW * 2) / 2
  const cx   = size / 2
  const cy   = size / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${Math.round(pct)}% complete`}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={strokeW} />
      {/* Progress */}
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.90)"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={r - 7} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="white" fontFamily="'DM Sans', sans-serif">
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="6" fontWeight="800" fill="rgba(255,255,255,0.65)" letterSpacing="0.10em" fontFamily="'DM Sans', sans-serif">
        DONE
      </text>
    </svg>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'active' | 'upcoming' | 'completed' }) {
  const map = {
    active:    { label: 'Active',    bg: T.emerald,  border: T.emeraldBrd, dot: T.emeraldDot },
    upcoming:  { label: 'Upcoming',  bg: T.amber,    border: T.amberBrd,   dot: T.amberDot   },
    completed: { label: 'Completed', bg: T.slate,    border: T.slateBrd,   dot: T.slateDot   },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-2 py-[3px] text-[9px] font-black text-white uppercase tracking-[0.11em]"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Chip (teal section) ────────────────────────────────────────────────────────
function Chip({
  icon: Icon, children, variant = 'default',
}: {
  icon: React.ElementType; children: React.ReactNode; variant?: 'default' | 'amber' | 'muted'
}) {
  const styles = {
    default: { bg: T.glass14,                        border: T.glass22    },
    amber:   { bg: T.amber,                          border: T.amberBrd   },
    muted:   { bg: 'rgba(255,255,255,0.07)',          border: T.glass14    },
  }
  const s = styles[variant]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-semibold text-white"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="h-[11px] w-[11px] shrink-0 opacity-80" strokeWidth={2.2} />
      {children}
    </span>
  )
}

// ── Stat cell (indigo section) ─────────────────────────────────────────────────
function StatCell({
  icon: Icon, iconBg, iconColor, value, label, labelColor,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: number
  label: string
  labelColor: string
}) {
  return (
    <div
      className="flex flex-col rounded-[14px] px-3 pt-3 pb-2.5 gap-2"
      style={{ background: T.indGlass07, border: `1px solid ${T.indGlass12}` }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="h-[13px] w-[13px] shrink-0" style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
        <span
          className="text-[24px] font-bold tabular-nums leading-none"
          style={{ color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
        >
          {value}
        </span>
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.10em]" style={{ color: labelColor }}>
        {label}
      </p>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface HeroCardProps {
  term: {
    name: string
    start_date?: string
    end_date?: string
    progress_pct?: number
    current_week?: number
    total_weeks?: number
    weeks_remaining?: number
    days_remaining?: number
    days_elapsed?: number
    total_days?: number
    status?: 'active' | 'upcoming' | 'completed'
    week_number?: number
    teaching_weeks?: number
  } | null
  drafts: number
  published: number
  scheduled: number
  /** Optional: next upcoming lesson to show in insight strip */
  nextLesson?: { title: string; time: string } | null
}

// ── HeroCard ───────────────────────────────────────────────────────────────────
export default function HeroCard({ term, drafts, published, scheduled, nextLesson }: HeroCardProps) {
  const router = useRouter()

  const pct         = term?.progress_pct    ?? 0
  const week        = term?.current_week    ?? term?.week_number    ?? 0
  const totalWeeks  = term?.total_weeks     ?? term?.teaching_weeks ?? 0
  const weeksLeft   = term?.weeks_remaining ?? 0
  const daysLeft    = term?.days_remaining  ?? 0
  const totalDays   = term?.total_days      ?? 0
  const daysElapsed = term?.days_elapsed    ?? 0
  const termStatus  = term?.status          ?? 'active'

  return (
    <section aria-label="Term overview" className="relative w-full overflow-hidden sm:rounded-[24px]">

      {/* ═══════════════════════════════════════════════
          TOP HALF — Teal
      ═══════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden px-5 pt-5 pb-7 sm:px-6"
        style={{ background: T.tealSolid }}
      >
        {/* Atmospheric orb top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-14 h-[220px] w-[220px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.11) 0%, transparent 65%)' }}
        />
        {/* Orb bottom-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-[160px] w-[160px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 65%)' }}
        />

        {/* Top bar */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] shrink-0"
              style={{ background: T.glass18, border: `1px solid ${T.glass22}` }}
            >
              <CalendarDays className="h-[14px] w-[14px] text-white opacity-80" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>
              Timetable Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: T.glass14, border: `1px solid ${T.glass22}` }}
                aria-label="Notifications"
              >
                <Bell className="h-[15px] w-[15px]" strokeWidth={2} />
              </button>
              <span
                aria-hidden
                className="absolute top-[7px] right-[7px] h-[6px] w-[6px] rounded-full"
                style={{ background: T.amberDot, border: `1.5px solid ${T.tealSolid}` }}
              />
            </div>
            {/* Avatar */}
            <div
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: T.glass18, border: `2px solid ${T.glass28}` }}
            >
              JK
            </div>
          </div>
        </div>

        {/* Term name + arc */}
        {term ? (
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Label + badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.13em]" style={{ color: T.textMuted }}>
                  Active term
                </span>
                <StatusBadge status={termStatus} />
              </div>

              {/* Name */}
              <h1
                className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] truncate mb-1"
                style={{ color: T.textPrimary, fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {term.name}
              </h1>

              {/* Dates */}
              {term.start_date && term.end_date && (
                <p className="text-[11.5px] font-medium mb-3.5" style={{ color: T.textSecond }}>
                  {fmt(term.start_date)} — {fmt(term.end_date)}
                </p>
              )}

              {/* Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(week > 0 || totalWeeks > 0) && (
                  <Chip icon={Clock} variant="default">Week {week || '—'} / {Math.round(totalWeeks) || '—'}</Chip>
                )}
                {termStatus === 'active' && daysLeft > 0 && (
                  <Chip icon={TrendingUp} variant="amber">{daysLeft}d · {weeksLeft}w left</Chip>
                )}
                {termStatus === 'upcoming' && term.start_date && (
                  <Chip icon={AlertCircle} variant="amber">Starts {fmt(term.start_date)}</Chip>
                )}
                {termStatus === 'completed' && (
                  <Chip icon={CheckCircle2} variant="muted">Term ended</Chip>
                )}
              </div>
            </div>

            {/* Progress arc */}
            {totalWeeks > 0 && (
              <div className="hidden sm:flex shrink-0">
                <ProgressArc pct={pct} size={82} />
              </div>
            )}
          </div>
        ) : (
          /* No term state */
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] mb-1.5" style={{ color: T.textMuted }}>
              No active term
            </p>
            <h1
              className="text-[22px] font-bold leading-[1.15] tracking-[-0.02em] mb-4"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Set up a term to begin
            </h1>
            <button
              onClick={() => router.push('/setup/terms')}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: T.glass18, border: `1px solid ${T.glass22}` }}
            >
              Go to Terms <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          WAVY SEAM DIVIDER
      ═══════════════════════════════════════════════ */}
      <div className="relative h-7 overflow-hidden -mt-px" aria-hidden>
        <svg
          viewBox="0 0 560 28"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <path d="M0,0 L560,0 L560,10 Q420,28 280,16 Q140,4 0,22 Z" fill={T.tealSolid} />
          <path d="M0,22 Q140,4 280,16 Q420,28 560,10 L560,28 L0,28 Z" fill="#1e1b4b" />
        </svg>
      </div>

      {/* ═══════════════════════════════════════════════
          BOTTOM HALF — Deep Indigo
      ═══════════════════════════════════════════════ */}
      <div
        className="relative px-5 pt-4 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-4"
        style={{ background: '#1e1b4b' }}
      >

        {/* Progress bar */}
        {term && totalDays > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMutedInd }}>
                Term progress
              </span>
              <span className="text-[10px] font-medium tabular-nums" style={{ color: T.textMutedInd }}>
                {daysElapsed}d elapsed · {daysLeft}d remaining
              </span>
            </div>
            {/* Track */}
            <div className="relative h-[6px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: termStatus === 'completed' ? T.emeraldDot : T.tealLight,
                }}
              />
            </div>
            {/* Week markers */}
            <div className="flex justify-between">
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Wk 1</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Wk {Math.round(totalWeeks / 2)}</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Wk {Math.round(totalWeeks)}</span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCell
            icon={Layers}
            iconBg="rgba(255,255,255,0.14)"
            iconColor="rgba(255,255,255,0.85)"
            value={drafts}
            label="Drafts"
            labelColor={T.textFaintInd}
          />
          <StatCell
            icon={CheckCircle2}
            iconBg={T.tealAccent24}
            iconColor={T.tealLight}
            value={published}
            label="Published"
            labelColor={T.tealAccentTxt}
          />
          <StatCell
            icon={Clock}
            iconBg={T.amberAccent22}
            iconColor={T.amberDot}
            value={scheduled}
            label="Scheduled"
            labelColor={T.amberAccentTxt}
          />
        </div>

        {/* Insight strip */}
        {nextLesson && (
          <div
            className="flex items-center gap-2.5 rounded-[12px] px-3 py-[10px]"
            style={{ background: T.indGlass07, border: `1px solid ${T.indGlass12}` }}
          >
            <Sparkles className="h-[14px] w-[14px] shrink-0" style={{ color: T.tealLight }} strokeWidth={2} />
            <p className="text-[11.5px] font-medium leading-[1.4]" style={{ color: 'rgba(255,255,255,0.80)' }}>
              Next:{' '}
              <strong className="font-bold" style={{ color: T.white }}>{nextLesson.title}</strong>
              {' · '}{nextLesson.time}
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2.5">
          <button
            onClick={() => router.push('/timetable')}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] py-[12px] px-4 text-[13px] font-bold tracking-[-0.01em] transition-all hover:opacity-90 hover:-translate-y-[1px] active:scale-[.98]"
            style={{ background: T.tealLight, color: '#0d4a42', border: 'none' }}
          >
            <BookOpen className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />
            View Timetable
          </button>
          <button
            onClick={() => router.push('/setup/term_units')}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] py-[12px] px-4 text-[13px] font-bold text-white tracking-[-0.01em] transition-all hover:-translate-y-[1px] active:scale-[.98]"
            style={{ background: T.indGlass10, border: `1px solid ${T.indGlass18}` }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = T.indGlass10)}
          >
            Assign Units
            <ArrowRight className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </section>
  )
}