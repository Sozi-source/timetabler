'use client'

import type { DashboardData } from '@/types'

type DashboardTerm = NonNullable<DashboardData['term']>

interface HeroBannerProps {
  term: DashboardTerm
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function HeroBanner({ term }: HeroBannerProps) {
  const pct = term.teaching_weeks > 0
    ? Math.min(100, Math.round(
        ((term.teaching_weeks - term.weeks_remaining) / term.teaching_weeks) * 100
      ))
    : 0

  const weekNum = term.current_week ?? term.week_number ?? 0
  const isComplete = pct >= 100

  return (
    <div
      className="relative overflow-hidden px-5 pt-10 pb-6"
      style={{ background: 'linear-gradient(160deg, #1a3352 0%, #0f1f33 100%)' }}
    >
      {/* Decorative circle */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full"
        style={{ background: 'rgba(100,180,255,0.05)' }}
      />

      {/* Greeting row */}
      <div className="relative flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-blue-300/60 mb-1">
            {getTodayLabel()}
          </p>
          <p className="font-display text-[22px] font-bold leading-tight text-[#e8f2ff] tracking-tight">
            {getGreeting()}
          </p>
        </div>
        {/* Avatar initials — swap with real user data when auth is wired */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-blue-100"
          style={{
            background: 'linear-gradient(135deg, #3a7bd5, #1a4f9c)',
            border: '1.5px solid rgba(120,180,255,0.25)',
          }}
        >
          AD
        </div>
      </div>

      {/* Term card */}
      <div
        className="relative rounded-2xl px-4 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
            Active term
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7' }}
          >
            {isComplete ? 'Complete' : 'Active'}
          </span>
        </div>

        <p className="font-display text-[15px] font-bold text-blue-100 mb-2.5 tracking-tight leading-snug">
          {term.name}
        </p>

        {/* Progress bar */}
        <div
          className="h-1 w-full rounded-full overflow-hidden mb-2"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] text-blue-300/45">
            Week {weekNum} of {term.teaching_weeks}
          </p>
          <p
            className="font-mono text-[11px] font-medium"
            style={{ color: isComplete ? '#6ee7b7' : 'rgba(148,163,184,0.7)' }}
          >
            {pct}% complete
          </p>
        </div>
      </div>
    </div>
  )
}