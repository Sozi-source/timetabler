'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, AlertTriangle, Settings2,
  Building2, LogOut, X, BookOpen, ChevronRight,
  GraduationCap, Users, DoorOpen, Clock, LayoutGrid,
  TrendingUp, ShieldCheck, Layers,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import { useEffect, useCallback } from 'react'

// ── Brand token (matches globals.css --brand) ─────────────────────────────
const BRAND       = '#0d9488'   // teal-600
const BRAND_DARK  = '#0f766e'   // teal-700
const BRAND_LIGHT = '#f0fdfa'   // teal-50
const BRAND_MID   = '#99f6e4'   // teal-200

// ── Nav structure ─────────────────────────────────────────────────────────
const NAV = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
      { href: '/conflicts',   icon: AlertTriangle,   label: 'Conflicts'   },
      { href: '/constraints', icon: ShieldCheck,     label: 'Constraints' },
    ],
  },
  {
    label: 'Timetables',
    items: [
      { href: '/timetable',          icon: Calendar,      label: 'Master'     },
      { href: '/timetable/cohorts',  icon: GraduationCap, label: 'By Cohort'  },
      { href: '/timetable/trainers', icon: Users,         label: 'By Trainer' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/setup/institution',    icon: Building2,   label: 'Institution'   },
      { href: '/setup/departments',    icon: LayoutGrid,  label: 'Departments'   },
      { href: '/setup/programmes',     icon: TrendingUp,  label: 'Programmes'    },
      { href: '/setup/curriculum',     icon: BookOpen,    label: 'Curriculum'    },
      { href: '/setup/periods',        icon: Clock,       label: 'Periods'       },
      { href: '/setup/rooms',          icon: DoorOpen,    label: 'Rooms'         },
      { href: '/setup/trainers',       icon: Users,       label: 'Trainers'      },
      { href: '/setup/terms',          icon: Calendar,    label: 'Terms'         },
      { href: '/setup/cohorts',        icon: GraduationCap, label: 'Cohorts'     },
      { href: '/setup/units-on-offer', icon: Layers,      label: 'Units on Offer'},
    ],
  },
]

// ── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s_]/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
      style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
    >
      {initials || <GraduationCap className="h-4 w-4" />}
    </div>
  )
}

// ── Sidebar inner ─────────────────────────────────────────────────────────
function SidebarInner({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex h-full w-60 flex-col bg-white border-r border-gray-100 overflow-hidden shadow-sm">

      {/* ── Logo ──────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: BRAND_DARK, fontFamily: 'var(--font-display)' }}
          >
            Timetabler
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="nav-label mb-1.5 px-2.5">{section.label}</p>

            <ul className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                // Exact match for dashboard, prefix match for others
                const active =
                  href === '/dashboard'
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + '/')

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                        active
                          ? 'font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      )}
                      style={active ? {
                        background: BRAND_LIGHT,
                        color: BRAND_DARK,
                      } : {}}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 transition-colors"
                        style={{ color: active ? BRAND : undefined }}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {active && (
                        <ChevronRight
                          className="h-3 w-3 shrink-0"
                          style={{ color: BRAND_MID }}
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────── */}
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

// ── Sidebar (with route-change close) ────────────────────────────────────
interface SidebarProps {
  open:    boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Stable reference so the effect dep is satisfied without re-registering
  const stableClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    stableClose()
  }, [pathname, stableClose])

  return (
    <>
      {/* Desktop — always visible */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60">
        <SidebarInner onClose={onClose} />
      </div>

      {/* Mobile — overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-2xl">
            <SidebarInner onClose={onClose} />
          </div>
        </div>
      )}
    </>
  )
}