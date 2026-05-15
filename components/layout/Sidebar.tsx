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
import { useEffect, useState } from 'react'

// ── Brand ─────────────────────────────────────────────────────────────────
const BRAND       = '#0d9488'
const BRAND_DARK  = '#0f766e'
const BRAND_LIGHT = '#f0fdfa'
const BRAND_MID   = '#5eead4'

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

const BOTTOM_NAV = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard', matchPrefix: '/dashboard' },
  { href: '/timetable',         icon: Calendar,        label: 'Timetable', matchPrefix: '/timetable' },
  { href: '/conflicts',         icon: AlertTriangle,   label: 'Conflicts', matchPrefix: '/conflicts'  },
  { href: '/setup/institution', icon: Settings,        label: 'Setup',     matchPrefix: '/setup'      },
]

// ── Sidebar width token — change here to update everywhere ────────────────
// w-56 = 224px — tighter than the old w-60 (240px), less dominant on large screens
const SIDEBAR_W      = 'w-56'
const SIDEBAR_PL     = 'lg:pl-56'   // exported for AppShell to use
const SIDEBAR_OFFSET = 'lg:left-56' // for the fixed wrapper

export { SIDEBAR_W, SIDEBAR_PL }

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

// ── Nav Item ──────────────────────────────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string
  icon: React.ElementType
  label: string
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = isActive(href, pathname)

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
          active
            ? 'font-semibold shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
        )}
        style={
          active
            ? {
                background: `linear-gradient(135deg, ${BRAND_LIGHT}, #ccfbf1)`,
                color: BRAND_DARK,
                boxShadow: `inset 0 0 0 1px ${BRAND_MID}40`,
              }
            : {}
        }
      >
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
            active ? '' : 'group-hover:bg-gray-100',
          )}
          style={active ? { background: `${BRAND}18` } : {}}
        >
          <Icon
            className="h-3.5 w-3.5"
            style={{ color: active ? BRAND : undefined }}
            strokeWidth={active ? 2.5 : 2}
          />
        </span>

        <span className="flex-1 truncate">{label}</span>

        {active && (
          <ChevronRight
            className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: BRAND_MID }}
          />
        )}
      </Link>
    </li>
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
    // w-56 = 224px — narrower sidebar that doesn't dominate on large screens
    <aside className={cn('flex h-full flex-col bg-white border-r border-gray-100/80 relative', SIDEBAR_W)}>
      {/* Subtle inner shadow on right edge */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gray-200/60 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4 shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-xl shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <Calendar className="h-3.5 w-3.5 text-white" />
        </div>
        <span
          className="text-[14px] font-bold tracking-tight"
          style={{ color: BRAND_DARK }}
        >
          Timetabler
        </span>
      </div>

      {/* Nav — scrollable */}
      <nav
        className="sidebar-nav flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${BRAND_MID} transparent`,
        }}
      >
        <style>{`
          .sidebar-nav::-webkit-scrollbar { width: 3px; }
          .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
          .sidebar-nav::-webkit-scrollbar-thumb { background: ${BRAND_MID}; border-radius: 99px; }
          .sidebar-nav::-webkit-scrollbar-thumb:hover { background: ${BRAND}; }
        `}</style>

        {NAV.map(section => (
          <div key={section.label} id={section.id}>
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400 whitespace-nowrap">
                {section.label}
              </p>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <ul className="space-y-0.5">
              {section.items.map(({ href, icon, label }) => (
                <NavItem key={href} href={href} icon={icon} label={label} />
              ))}
            </ul>
          </div>
        ))}

        <div className="h-2" />
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-gray-50/40">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.username ?? 'U'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800 leading-tight">
              {user?.username ?? '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
              {user?.role === 'ADMIN' ? 'Administrator' : 'Trainer'}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-150 shrink-0"
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
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center px-4 gap-3">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
      >
        <Calendar className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {currentSection && (
          <p
            className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5"
            style={{ color: BRAND }}
          >
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100"
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
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all duration-150 pt-1',
                active ? '' : 'text-gray-400',
              )}
              style={active ? { color: BRAND_DARK } : {}}
            >
              <div
                className="flex items-center justify-center w-10 h-6 rounded-full transition-all duration-150"
                style={active ? { background: `${BRAND}15` } : {}}
              >
                <Icon
                  className="h-5 w-5 transition-all duration-150"
                  strokeWidth={active ? 2.5 : 1.75}
                  style={{ color: active ? BRAND : undefined }}
                />
              </div>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ── Mobile Drawer ─────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  useEffect(() => { onClose() }, [pathname])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-sm"
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

        <nav
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${BRAND_MID} transparent` }}
        >
          {NAV.map(section => (
            <div key={section.label} id={`mobile-${section.id}`}>
              <div className="mb-1.5 flex items-center gap-2 px-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  {section.label}
                </p>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <ul className="space-y-0.5">
                {section.items.map(({ href, icon, label }) => (
                  <NavItem key={href} href={href} icon={icon} label={label} onClick={onClose} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className="border-t border-gray-100 bg-gray-50/40 px-5 py-3 shrink-0"
          style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom))` }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={user?.username ?? 'U'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800 leading-tight">
                {user?.username ?? '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Trainer'}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
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
      {/* Desktop: fixed left sidebar — w-56 wide */}
      <div className={cn('hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex', SIDEBAR_W)}>
        <DesktopSidebar />
      </div>

      <MobileTopBar onOpenDrawer={onOpen} />
      <MobileBottomNav />
      <MobileDrawer open={open} onClose={onClose} />
    </>
  )
}