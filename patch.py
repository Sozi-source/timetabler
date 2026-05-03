"""
patch.py — Full Responsive Design Patch for fe-timetable
Run from: C:\\Users\\sozi\\Desktop\\2026-projects\\Timetable\\fe-timetable
Usage:    python patch.py
"""

import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(rel):
    path = os.path.join(ROOT, rel.replace("\\", os.sep).replace("/", os.sep))
    if not os.path.exists(path):
        print(f"  ⚠  SKIP (not found): {rel}")
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()

def write(rel, content):
    path = os.path.join(ROOT, rel.replace("\\", os.sep).replace("/", os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✅  PATCHED: {rel}")

def patch(rel, old, new):
    content = read(rel)
    if content is None:
        return
    if old not in content:
        print(f"  ⚠  PATTERN NOT FOUND in {rel} — skipping this patch")
        return
    write(rel, content.replace(old, new, 1))


# ═══════════════════════════════════════════════════════════════════════════════
# 1. globals.css — inject full responsive design system
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[1/14] globals.css — responsive design tokens + utilities")

NEW_GLOBALS = '''@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --brand: #1e3a5f;
  --brand-dark: #162d4a;
  --brand-light: #e8eef5;
  --radius-card: 0.75rem;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* ── Responsive stat grid ── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
}
@media (min-width: 480px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 768px) {
  .stat-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ── Stat card — professional touch ── */
.stat-card {
  border-radius: var(--radius-card);
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 1.25rem;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card::after {
  content: "";
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: var(--brand);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s ease;
}
.stat-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  transform: translateY(-1px);
}
.stat-card:hover::after { transform: scaleX(1); }

/* ── Fit-card: prevent overflow on small screens ── */
.fit-card {
  min-width: 0;
  word-break: break-word;
}
.fit-card * { min-width: 0; }

/* ── Responsive list: stack on mobile, flex-row on lg ── */
.responsive-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}
@media (min-width: 1024px) {
  .responsive-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .responsive-list > * {
    flex: 1 1 260px;
  }
}

/* ── Conflict card responsive ── */
.conflict-card {
  border-radius: var(--radius-card);
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 1rem;
}
@media (max-width: 640px) {
  .conflict-card { padding: 0.75rem; }
  .conflict-card .conflict-actions { flex-direction: column; align-items: stretch; }
}

/* ── Setup table: horizontal scroll on mobile ── */
.setup-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-card);
}

/* ── Timetable header ── */
.timetable-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
@media (max-width: 640px) {
  .timetable-header { flex-direction: column; }
  .timetable-actions {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
  .timetable-actions > * { width: 100%; justify-content: center; }
}

/* ── Cohort pills: wrap on small screens ── */
.cohort-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* ── Modal: mobile-safe ── */
.modal-body {
  max-height: 90vh;
  overflow-y: auto;
}
@media (max-width: 640px) {
  .modal-body { max-height: 80vh; }
}

/* ── Topbar responsive ── */
@media (max-width: 640px) {
  .topbar-week-badge { display: none !important; }
  .topbar-advance-btn span { display: none; }
}

/* ── Auth layout ── */
@media (max-width: 480px) {
  .auth-card { padding: 1.5rem !important; }
}
'''

write("app/globals.css", NEW_GLOBALS)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. AppShell — ensure correct padding and layout
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[2/14] AppShell.tsx — responsive layout")

patch(
    "components/layout/AppShell.tsx",
    '<main className="p-4 lg:p-6">{children}</main>',
    '<main className="p-3 sm:p-4 lg:p-6 min-w-0">{children}</main>',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Topbar — add topbar-week-badge class + responsive advance btn
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[3/14] Topbar.tsx — responsive badges")

patch(
    "components/layout/Topbar.tsx",
    'className="hidden rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium lg:inline"',
    'className="topbar-week-badge hidden rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium lg:inline"',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. StatCard — professional redesign with icon accent + hover lift
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[4/14] StatCard.tsx — professional redesign")

NEW_STAT_CARD = '''import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: 'default' | 'amber' | 'emerald' | 'red' | 'blue'
  badge?: string
  sub?: string
}

const accents = {
  default: { icon: 'bg-slate-100 text-[#1e3a5f]',  bar: 'bg-[#1e3a5f]' },
  amber:   { icon: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  red:     { icon: 'bg-red-100 text-red-700',       bar: 'bg-red-500' },
  blue:    { icon: 'bg-blue-100 text-blue-700',     bar: 'bg-blue-500' },
}

export default function StatCard({
  label, value, icon: Icon, accent = 'default', badge, sub,
}: StatCardProps) {
  const a = accents[accent]
  return (
    <div className="stat-card group">
      {/* Icon */}
      <div className={cn('rounded-xl p-2.5 shrink-0 transition-transform group-hover:scale-110', a.icon)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">{value}</span>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', a.icon)}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>}
      </div>

      {/* Accent bar — visible on hover via CSS */}
    </div>
  )
}
'''

write("components/features/dashboard/StatCard.tsx", NEW_STAT_CARD)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Dashboard page — use stat-grid + responsive bottom row
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[5/14] dashboard/page.tsx — stat-grid + responsive layout")

patch(
    "app/(dashboard)/dashboard/page.tsx",
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">',
    '<div className="stat-grid">',
)

patch(
    "app/(dashboard)/dashboard/page.tsx",
    '<div className="grid grid-cols-4 gap-3">',
    '<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">',
)

patch(
    "app/(dashboard)/dashboard/page.tsx",
    '<div className="flex flex-wrap gap-2">',
    '<div className="flex flex-wrap gap-2 timetable-actions">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Trainer dashboard — stat-grid
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[6/14] dashboard/trainer/page.tsx — stat-grid")

patch(
    "app/(dashboard)/dashboard/trainer/page.tsx",
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">',
    '<div className="stat-grid animate-pulse">',
)

patch(
    "app/(dashboard)/dashboard/trainer/page.tsx",
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">',
    '<div className="stat-grid">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. SetupTable — add setup-table-wrap
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[7/14] SetupTable.tsx — horizontal scroll wrapper")

patch(
    "components/features/setup/SetupTable.tsx",
    '    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">',
    '    <div className="setup-table-wrap rounded-xl border border-gray-200 bg-white shadow-sm">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 8. ConflictCard — add fit-card + conflict-card classes
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[8/14] ConflictCard.tsx — fit-card + responsive actions")

patch(
    "components/features/conflicts/ConflictCard.tsx",
    "    <div className={cn('rounded-xl border p-4 space-y-3', SEVERITY_STYLES[conflict.severity] ?? 'border-gray-200 bg-white')}>",
    "    <div className={cn('conflict-card fit-card rounded-xl border p-4 space-y-3', SEVERITY_STYLES[conflict.severity] ?? 'border-gray-200 bg-white')}>",
)

patch(
    "components/features/conflicts/ConflictCard.tsx",
    '      <div className="flex items-start justify-between gap-3">',
    '      <div className="conflict-actions flex items-start justify-between gap-3">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 9. EntryCard — add fit-card
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[9/14] EntryCard.tsx — fit-card")

patch(
    "components/features/timetable/EntryCard.tsx",
    "        'w-full text-left rounded-md border p-1.5 text-xs transition-opacity hover:opacity-80 active:scale-[0.98]',",
    "        'fit-card w-full text-left rounded-md border p-1.5 text-xs transition-opacity hover:opacity-80 active:scale-[0.98]',",
)


# ═══════════════════════════════════════════════════════════════════════════════
# 10. TimetableGrid — overflow-x-auto wrapper
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[10/14] TimetableGrid.tsx — overflow scroll")

patch(
    "components/features/timetable/TimetableGrid.tsx",
    '      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">',
    '      <div className="setup-table-wrap rounded-xl border border-gray-200 bg-white shadow-sm">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 11. Timetable master page — timetable-header, timetable-actions, cohort-pills
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[11/14] timetable/page.tsx — timetable-header + cohort-pills")

patch(
    "app/(dashboard)/timetable/page.tsx",
    '      <div className="flex items-start justify-between gap-4 flex-wrap">',
    '      <div className="timetable-header">',
)

patch(
    "app/(dashboard)/timetable/page.tsx",
    '        <div className="flex items-center gap-2 flex-wrap">',
    '        <div className="timetable-actions flex items-center gap-2 flex-wrap">',
)

patch(
    "app/(dashboard)/timetable/page.tsx",
    '      {cohorts.length > 0 && (\n        <div className="flex items-center gap-2 flex-wrap">',
    '      {cohorts.length > 0 && (\n        <div className="cohort-pills">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 12. Conflicts page — responsive filters
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[12/14] conflicts/page.tsx — responsive filters")

patch(
    "app/(dashboard)/conflicts/page.tsx",
    '      <div className="flex items-center justify-between">',
    '      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# 13. Cohort selector page — responsive grid
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[13/14] timetable/cohort/page.tsx — already responsive (skip)")


# ═══════════════════════════════════════════════════════════════════════════════
# 14. Sidebar nav ul — add responsive-list class
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[14/14] Sidebar.tsx — nav list class")

patch(
    "components/layout/Sidebar.tsx",
    '            <ul className="space-y-0.5">',
    '            <ul className="space-y-0.5 responsive-list lg:flex-col">',
)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("""
╔══════════════════════════════════════════════════════════╗
║           Responsive Design Patch — COMPLETE             ║
╠══════════════════════════════════════════════════════════╣
║  1.  globals.css         — design tokens + utilities     ║
║  2.  AppShell.tsx        — safe main padding             ║
║  3.  Topbar.tsx          — responsive week badge         ║
║  4.  StatCard.tsx        — professional redesign         ║
║  5.  dashboard/page.tsx  — stat-grid + actions           ║
║  6.  trainer/page.tsx    — stat-grid                     ║
║  7.  SetupTable.tsx      — horizontal scroll             ║
║  8.  ConflictCard.tsx    — fit-card + actions            ║
║  9.  EntryCard.tsx       — fit-card                      ║
║  10. TimetableGrid.tsx   — overflow scroll               ║
║  11. timetable/page.tsx  — header + cohort pills         ║
║  12. conflicts/page.tsx  — responsive filters            ║
║  13. cohort/page.tsx     — already responsive ✓          ║
║  14. Sidebar.tsx         — nav list responsive           ║
╚══════════════════════════════════════════════════════════╝

Next steps:
  1. Run: npm run dev
  2. Test on mobile (DevTools → Toggle device toolbar)
  3. Check dashboard stat cards have hover lift animation
  4. Verify timetable grid scrolls horizontally on mobile
""")
