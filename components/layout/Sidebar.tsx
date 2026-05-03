'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, AlertTriangle,
  Settings2, Building2, LogOut, X, Menu,
  BookOpen,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

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
      { href: '/setup/institution', icon: Building2, label: 'Institution' },
      { href: '/setup/departments', icon: Building2, label: 'Departments' },
      { href: '/setup/programmes',  icon: Building2, label: 'Programmes' },
      { href: '/setup/curriculum',  icon: Building2, label: 'Curriculum' },
      { href: '/setup/periods',     icon: Building2, label: 'Periods' },
      { href: '/setup/rooms',       icon: Building2, label: 'Rooms' },
      { href: '/setup/trainers',    icon: Building2, label: 'Trainers' },
      { href: '/setup/terms',       icon: Building2, label: 'Terms' },
      { href: '/setup/cohorts',     icon: Building2, label: 'Cohorts' },
      { href: "/setup/units-on-offer", label: "Units on Offer", icon: BookOpen }
    ],
  },
]

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
    <aside className="flex h-full w-60 flex-col bg-[#1e3a5f] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-amber-400" />
          <span className="text-lg font-semibold tracking-tight">Timetabler</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded text-white/50 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {section.label}
            </p>
            <ul className="space-y-0.5 responsive-list lg:flex-col">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-amber-400/20 text-amber-300 font-medium'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.username ?? '—'}</p>
            <p className="text-xs text-white/50">{user?.role === 'ADMIN' ? 'Admin' : 'Trainer'}</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
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
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-60">
            {inner}
          </div>
        </div>
      )}
    </>
  )
}