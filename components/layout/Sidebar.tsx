'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, AlertTriangle,
  Building2, LogOut, X, BookOpen, ChevronRight,
  GraduationCap, Users, DoorOpen, Clock, LayoutGrid,
  TrendingUp, ShieldCheck, Layers, Menu, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import { useEffect, useCallback, useState } from 'react'

// ── Brand ─────────────────────────────────────────────────────────────────
const BRAND       = '#0d9488'
const BRAND_DARK  = '#0f766e'
const BRAND_LIGHT = '#f0fdfa'
const BRAND_MID   = '#99f6e4'

// ── Nav structure ─────────────────────────────────────────────────────────
const NAV = [
  {
    id: 'nav-main',
    label: 'Main',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
      { href: '/conflicts',   icon: AlertTriangle,   label: 'Conflicts'   },
      { href: '/constraints', icon: ShieldCheck,     label: 'Constraints' },
    ],
  },
  {
    id: 'nav-timetables',
    label: 'Timetables',
    items: [
      { href: '/timetable',          icon: Calendar,      label: 'Master'     },
      { href: '/timetable/cohorts',  icon: GraduationCap, label: 'By Cohort'  },
      { href: '/timetable/trainers', icon: Users,         label: 'By Trainer' },
    ],
  },
  {
    id: 'nav-setup',
    label: 'Setup',
    items: [
      { href: '/setup/institution',  icon: Building2,     label: 'Institution'  },
      { href: '/setup/departments',  icon: LayoutGrid,    label: 'Departments'  },
      { href: '/setup/programmes',   icon: TrendingUp,    label: 'Programmes'   },
      { href: '/setup/curriculum',   icon: BookOpen,      label: 'Curriculum'   },
      { href: '/setup/periods',      icon: Clock,         label: 'Periods'      },
      { href: '/setup/rooms',        icon: DoorOpen,      label: 'Rooms'        },
      { href: '/setup/trainers',     icon: Users,         label: 'Trainers'     },
      { href: '/setup/terms',        icon: Calendar,      label: 'Terms'        },
      { href: '/setup/cohorts',      icon: GraduationCap, label: 'Cohorts'      },
      { href: '/setup/term_units',   icon: Layers,        label: 'Term Units'   },
    ],
  },
]

// Bottom nav — one entry per top-level section
const BOTTOM_NAV = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard', matchPrefix: '/dashboard' },
  { href: '/timetable',         icon: Calendar,        label: 'Timetable', matchPrefix: '/timetable' },
  { href: '/conflicts',         icon: AlertTriangle,   label: 'Conflicts', matchPrefix: '/conflicts'  },
  { href: '/setup/institution', icon: Settings,        label: 'Setup',     matchPrefix: '/setup'      },
]

// ── Helpers ───────────────────────────────────────────────────────────────
function isActive(href: string, pathname: string) {
  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
}

function getActiveSection(pathname: string) {
  return NAV.find(s => s.items.some(i => isActive(i.href, pathname)))
}

// ── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(/[\s_]/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-xl font-bold text-white', dim)}
      style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
    >
      {initials || <GraduationCap className="h-3.5 w-3.5" />}
    </div>
  )
}

// ── Desktop Sidebar ───────────────────────────────────────────────────────
function DesktopSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    const activeSection = getActiveSection(pathname)
    if (activeSection?.id) {
      setTimeout(() => {
        document
          .getElementById(activeSection.id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [pathname])

  return (
    <aside className="flex h-full w-60 flex-col bg-white border-r border-gray-100 shadow-sm">

      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5 shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: BRAND_DARK }}
        >
          Timetabler
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
        {NAV.map(section => (
          <div key={section.label} id={section.id}>
            <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href, pathname)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                        active
                          ? 'font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                      )}
                      style={active ? { background: BRAND_LIGHT, color: BRAND_DARK } : {}}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: active ? BRAND : undefined }}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {active && (
                        <ChevronRight className="h-3 w-3 shrink-0" style={{ color: BRAND_MID }} />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={user?.username ?? 'U'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800 leading-tight">
              {user?.username ?? '—'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {user?.role === 'ADMIN' ? 'Administrator' : 'Trainer'}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ── Mobile Top Bar ────────────────────────────────────────────────────────
function MobileTopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const currentItem    = NAV.flatMap(s => s.items).find(i => isActive(i.href, pathname))
  const currentSection = getActiveSection(pathname)

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shadow-sm">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
      >
        <Calendar className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {currentSection && (
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: BRAND }}>
            {currentSection.label}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-800 truncate leading-none">
          {currentItem?.label ?? 'Timetabler'}
        </p>
      </div>

      <Avatar name={user?.username ?? 'U'} size="sm" />

      <button
        onClick={onOpenDrawer}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
    </header>
  )
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────
function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {BOTTOM_NAV.map(({ href, icon: Icon, label, matchPrefix }) => {
          const active = pathname === matchPrefix || pathname.startsWith(matchPrefix + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors pt-1',
                active ? 'text-[#0f766e]' : 'text-gray-400',
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-6 rounded-full transition-all',
                active ? 'bg-teal-50' : '',
              )}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.75} />
              </div>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ── Mobile Drawer (slides up from bottom) ─────────────────────────────────
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  useEffect(() => { onClose() }, [pathname])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: BRAND_DARK }}>
              Timetabler
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {NAV.map(section => (
            <div key={section.label} id={`mobile-${section.id}`}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, icon: Icon, label }) => {
                  const active = isActive(href, pathname)
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all',
                          active ? 'font-semibold' : 'text-gray-500',
                        )}
                        style={active ? { background: BRAND_LIGHT, color: BRAND_DARK } : {}}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: active ? BRAND : undefined }}
                        />
                        <span className="flex-1">{label}</span>
                        {active && (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND_MID }} />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="border-t border-gray-100 bg-gray-50/60 px-5 py-3 shrink-0"
          style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom))` }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={user?.username ?? 'U'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">{user?.username ?? '—'}</p>
              <p className="text-[11px] text-gray-400">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Trainer'}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
interface SidebarProps {
  open:    boolean
  onClose: () => void
  onOpen:  () => void
}

export default function Sidebar({ open, onClose, onOpen }: SidebarProps) {
  return (
    <>
      {/* Desktop: fixed left sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60">
        <DesktopSidebar />
      </div>

      {/* Mobile: fixed top bar */}
      <MobileTopBar onOpenDrawer={onOpen} />

      {/* Mobile: fixed bottom tab bar */}
      <MobileBottomNav />

      {/* Mobile: slide-up drawer */}
      <MobileDrawer open={open} onClose={onClose} />
    </>
  )
}