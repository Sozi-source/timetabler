'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottonNav'
import type { Term } from '@/types'

// ── Breadcrumb config ─────────────────────────────────────────────────────────
// Maps path segments to human-readable labels.
// Dynamic segments (e.g. UUIDs / IDs) fall back to the raw value.
const SEGMENT_LABELS: Record<string, string> = {
  dashboard:    'Dashboard',
  timetable:    'Timetable',
  cohorts:      'Cohorts',
  trainers:     'Trainers',
  setup:        'Setup',
  terms:        'Terms',
  rooms:        'Rooms',
  curriculum:   'Curriculum',
  periods:      'Periods',
  departments:  'Departments',
  programmes:   'Programmes',
  constraints:  'Constraints',
  conflicts:    'Conflicts',
  edit:         'Edit',
  new:          'New',
}

function humanise(segment: string): string {
  // Return known label or Title-Case the raw segment
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

interface Crumb {
  label: string
  href:  string
}

function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname()
  if (!pathname) return []

  // Strip leading slash, split, and filter empties
  const parts = pathname.replace(/^\//, '').split('/').filter(Boolean)

  const crumbs: Crumb[] = [{ label: 'Home', href: '/dashboard' }]

  parts.reduce((acc, segment) => {
    const href = `${acc}/${segment}`
    crumbs.push({ label: humanise(segment), href })
    return href
  }, '')

  return crumbs
}

// ── Breadcrumb component ──────────────────────────────────────────────────────
function Breadcrumbs() {
  const router   = useRouter()
  const crumbs   = useBreadcrumbs()
  const pathname = usePathname()

  if (crumbs.length <= 1) return null   // Only "Home" — nothing to show

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb px-3 sm:px-4 lg:px-6 py-2 bg-white border-b border-gray-100">
      {crumbs.map((crumb, i) => {
        const isLast    = i === crumbs.length - 1
        const isCurrent = pathname === crumb.href

        return (
          <span key={crumb.href} className={`breadcrumb-item${isLast ? ' active' : ''}`}>
            {i === 0 ? (
              // Home — icon only
              <button
                onClick={() => router.push(crumb.href)}
                className="flex items-center gap-1"
                aria-label="Home"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
            ) : isLast || isCurrent ? (
              <span>{crumb.label}</span>
            ) : (
              <button onClick={() => router.push(crumb.href)}>
                {crumb.label}
              </button>
            )}

            {!isLast && (
              <span className="breadcrumb-sep" aria-hidden>
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
interface AppShellProps {
  children:         React.ReactNode
  title?:           string
  /** Override auto-generated breadcrumbs with custom ones */
  breadcrumbs?:     Crumb[]
  /** Hide breadcrumbs entirely for this page */
  hideBreadcrumbs?: boolean
}

export default function AppShell({
  children,
  title,
  hideBreadcrumbs = false,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeTerm, setActiveTerm } = useTermStore()
  const pathname = usePathname()

  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn:  getTerms,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const current = terms.find((t: Term) => t.is_current) ?? terms[0]
      setActiveTerm(current)
    }
  }, [terms, activeTerm, setActiveTerm])

  // Hide breadcrumbs on the dashboard home — it's the root, no trail needed
  const isDashboardRoot = pathname === '/dashboard'
  const showBreadcrumbs = !hideBreadcrumbs && !isDashboardRoot

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — desktop always visible, mobile overlay */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column — offset on desktop for sidebar */}
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />

        {showBreadcrumbs && <Breadcrumbs />}

        {/*
          pb-20 on mobile = clears the fixed BottomNav (h-16 + safe-area).
          On lg+ BottomNav is hidden so standard padding applies.
        */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile-only bottom navigation */}
      <BottomNav />
    </div>
  )
}

export type { Crumb }