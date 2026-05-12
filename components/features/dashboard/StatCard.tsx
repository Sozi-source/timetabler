'use client'

/**
 * StatCard — institutional-grade, spec-compliant
 *
 * Desktop: white card, bg-white, shadow-sm → shadow-md on hover,
 *          icon chip = tinted bg at ~10% opacity, full-color icon,
 *          DM Serif Display value, DM Sans labels.
 *          NO truncate — all text wraps fully at every viewport width.
 *
 * Mobile:  solid-color accent row, compact horizontal layout,
 *          icon chip = white/15–20 bg, white text throughout.
 *          Sub-label wraps (no truncate).
 *
 * Motion:  duration-150 for color/bg · duration-200 for shadow/transform
 */

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Root layout must load and expose these as CSS variables on <html>:
//   --font-serif: 'DM Serif Display', serif
//   --font-sans:  'DM Sans', sans-serif

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: 'default' | 'amber' | 'emerald' | 'red' | 'blue'
  badge?: string
  sub?: string
}

const accents = {
  default: {
    mobile: {
      card:     'bg-[#1e3a5f] border-[#1e3a5f]',
      iconWrap: 'bg-white/15 text-white',
      label:    'text-white/60',
      value:    'text-white',
      badge:    'bg-white/20 text-white',
      sub:      'text-white/50',
      shine:    'from-white/8 via-white/4 to-transparent',
    },
    desktop: {
      iconWrap: 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
      label:    'text-gray-400',
      value:    'text-gray-900',
      badge:    'bg-[#1e3a5f]/10 text-[#1e3a5f]',
      sub:      'text-gray-500',
      dot:      'bg-[#1e3a5f]',
    },
  },
  amber: {
    mobile: {
      card:     'bg-amber-500 border-amber-400',
      iconWrap: 'bg-white/20 text-white',
      label:    'text-white/60',
      value:    'text-white',
      badge:    'bg-white/20 text-white',
      sub:      'text-white/50',
      shine:    'from-white/10 via-white/4 to-transparent',
    },
    desktop: {
      iconWrap: 'bg-amber-500/10 text-amber-600',
      label:    'text-gray-400',
      value:    'text-gray-900',
      badge:    'bg-amber-500/10 text-amber-600',
      sub:      'text-gray-500',
      dot:      'bg-amber-500',
    },
  },
  emerald: {
    mobile: {
      card:     'bg-emerald-600 border-emerald-500',
      iconWrap: 'bg-white/20 text-white',
      label:    'text-white/60',
      value:    'text-white',
      badge:    'bg-white/20 text-white',
      sub:      'text-white/50',
      shine:    'from-white/10 via-white/4 to-transparent',
    },
    desktop: {
      iconWrap: 'bg-emerald-600/10 text-emerald-700',
      label:    'text-gray-400',
      value:    'text-gray-900',
      badge:    'bg-emerald-600/10 text-emerald-700',
      sub:      'text-gray-500',
      dot:      'bg-emerald-600',
    },
  },
  red: {
    mobile: {
      card:     'bg-rose-600 border-rose-500',
      iconWrap: 'bg-white/20 text-white',
      label:    'text-white/60',
      value:    'text-white',
      badge:    'bg-white/20 text-white',
      sub:      'text-white/50',
      shine:    'from-white/10 via-white/4 to-transparent',
    },
    desktop: {
      iconWrap: 'bg-rose-600/10 text-rose-600',
      label:    'text-gray-400',
      value:    'text-gray-900',
      badge:    'bg-rose-600/10 text-rose-600',
      sub:      'text-gray-500',
      dot:      'bg-rose-600',
    },
  },
  blue: {
    mobile: {
      card:     'bg-blue-600 border-blue-500',
      iconWrap: 'bg-white/20 text-white',
      label:    'text-white/60',
      value:    'text-white',
      badge:    'bg-white/20 text-white',
      sub:      'text-white/50',
      shine:    'from-white/10 via-white/4 to-transparent',
    },
    desktop: {
      iconWrap: 'bg-blue-600/10 text-blue-600',
      label:    'text-gray-400',
      value:    'text-gray-900',
      badge:    'bg-blue-600/10 text-blue-600',
      sub:      'text-gray-500',
      dot:      'bg-blue-600',
    },
  },
} as const

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'default',
  badge,
  sub,
}: StatCardProps) {
  const { mobile: m, desktop: d } = accents[accent]

  return (
    <>
      {/* ── MOBILE: solid accent, compact horizontal row ──────────────────
          Visible only below sm breakpoint
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border',
          'px-4 py-3.5',
          'shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px',
          'sm:hidden',
          m.card,
        )}
      >
        {/* Diagonal shine highlight */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-br',
            m.shine,
          )}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          {/* Icon chip — h-9 w-9 per spec */}
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              'transition-transform duration-200 group-hover:scale-105',
              m.iconWrap,
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </div>

          {/* Text block — flex-1 + min-w-0 allows wrapping, NO truncate */}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.1em] leading-none',
                'font-[family-name:var(--font-sans)]',
                m.label,
              )}
            >
              {label}
            </p>

            <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
              <span
                className={cn(
                  'text-2xl font-normal leading-tight tabular-nums',
                  'font-[family-name:var(--font-serif)]',
                  m.value,
                )}
              >
                {value}
              </span>
              {badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    'transition-colors duration-150',
                    m.badge,
                  )}
                >
                  {badge}
                </span>
              )}
            </div>

            {/* Sub: wraps naturally, NO truncate */}
            {sub && (
              <p
                className={cn(
                  'mt-0.5 text-[11px] leading-snug break-words',
                  'font-[family-name:var(--font-sans)]',
                  m.sub,
                )}
              >
                {sub}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: white card, tinted chip, vertical layout ────────────
          Visible only at ≥sm breakpoint
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'group relative hidden overflow-hidden rounded-2xl border border-gray-100 bg-white',
          'px-5 py-4',
          'shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px',
          'sm:block',
        )}
      >
        {/* Top row: icon chip + optional badge */}
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              'transition-transform duration-200 group-hover:scale-105',
              d.iconWrap,
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </div>

          {badge && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
                'transition-colors duration-150',
                d.badge,
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Hero value — DM Serif Display, 32px, tabular nums */}
        <p
          className={cn(
            'text-[2rem] font-normal leading-none tracking-tight tabular-nums',
            'font-[family-name:var(--font-serif)]',
            d.value,
          )}
        >
          {value}
        </p>

        {/* Label — 10px uppercase tracked, DM Sans, wraps fully, NO truncate */}
        <p
          className={cn(
            'mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] leading-snug',
            'font-[family-name:var(--font-sans)]',
            d.label,
          )}
        >
          {label}
        </p>

        {/* Sub-label — 12px body, wraps fully, NO truncate */}
        {sub && (
          <p
            className={cn(
              'mt-1 text-[12px] leading-snug break-words',
              'font-[family-name:var(--font-sans)]',
              d.sub,
            )}
          >
            {sub}
          </p>
        )}

        {/* Accent rule — 2px × 40px bottom-left, brand anchor */}
        <span
          className={cn(
            'absolute bottom-0 left-0 h-0.5 w-10 rounded-full',
            'opacity-50 transition-opacity duration-150 group-hover:opacity-100',
            d.dot,
          )}
          aria-hidden="true"
        />
      </div>
    </>
  )
}