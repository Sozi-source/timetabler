'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, AlertTriangle,
  Settings2, Building2, LogOut, X,
  BookOpen, ChevronRight, GraduationCap, UserCheck,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const NAV = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/conflicts',   icon: AlertTriangle,   label: 'Conflicts' },
      { href: '/constraints', icon: Settings2,       label: 'Constraints' },
    ],
  },
  {
    label: 'Timetables',
    items: [
      { href: '/timetable',         icon: Calendar, label: 'Master' },
      { href: '/timetable/cohort',  icon: Calendar, label: 'By Cohort' },
      { href: '/timetable/trainer', icon: Calendar, label: 'By Trainer' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/setup/institution',          icon: Building2,   label: 'Institution' },
      { href: '/setup/departments',          icon: Building2,   label: 'Departments' },
      { href: '/setup/programmes',           icon: Building2,   label: 'Programmes' },
      { href: '/setup/curriculum',           icon: Building2,   label: 'Curriculum' },
      { href: '/setup/periods',              icon: Building2,   label: 'Periods' },
      { href: '/setup/rooms',                icon: Building2,   label: 'Rooms' },
      { href: '/setup/trainers',             icon: Building2,   label: 'Trainers' },
      { href: '/setup/terms',                icon: Building2,   label: 'Terms' },
      { href: '/setup/cohorts',              icon: Building2,   label: 'Cohorts' },
      { href: '/setup/units-on-offer',       icon: BookOpen,    label: 'Units on Offer' },
    ],
  },
]

// Initials avatar for user
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s_]/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 ring-1 ring-amber-400/30 text-amber-300 text-xs font-bold">
      {initials || <GraduationCap className="h-4 w-4" />}
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  // Close sidebar on route change (mobile)
  useEffect(() => { onClose() }, [pathname])

  const inner = (
    <aside className="flex h-full w-60 flex-col bg-[#1e3a5f] text-white overflow-hidden">

      {/* ── Logo ───────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/25">
            <Calendar className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">Timetabler</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
              {section.label}
            </p>

            <ul className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                        active
                          ? 'bg-amber-400/15 text-amber-300 font-semibold ring-1 ring-amber-400/20'
                          : 'text-white/60 hover:bg-white/8 hover:text-white'
                      )}
                    >
                      <Icon className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-amber-400' : 'text-white/40 group-hover:text-white/70'
                      )} />
                      <span className="flex-1 truncate">{label}</span>
                      {active && (
                        <ChevronRight className="h-3 w-3 text-amber-400/60 shrink-0" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ────────────────────────────────── */}
      <div className="border-t border-white/10 bg-white/[0.03] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={user?.username ?? 'U'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{user?.username ?? '—'}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {user?.role === 'ADMIN' ? 'Administrator' : 'Trainer'}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60">
        {inner}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-2xl">
            {inner}
          </div>
        </div>
      )}
    </>
  )
}