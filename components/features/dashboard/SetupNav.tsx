'use client'

import { ChevronRight } from 'lucide-react'

const SETUP_LINKS = [
  { label: 'Institution',  href: '/setup/institution' },
  { label: 'Departments',  href: '/setup/departments' },
  { label: 'Programmes',   href: '/setup/programmes' },
  { label: 'Curriculum',   href: '/setup/curriculum' },
  { label: 'Trainers',     href: '/setup/trainers' },
  { label: 'Rooms',        href: '/setup/rooms' },
  { label: 'Cohorts',      href: '/setup/cohorts' },
  { label: 'Terms',        href: '/setup/terms' },
  { label: 'Constraints',  href: '/constraints' },
] as const

interface SetupNavProps {
  onNavigate: (href: string) => void
}

export default function SetupNav({ onNavigate }: SetupNavProps) {
  return (
    <div className="space-y-3">
      <p
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: '#374151' }}
      >
        Setup
      </p>

      <div
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
      >
        {SETUP_LINKS.map(({ label, href }, i) => (
          <button
            key={href}
            onClick={() => onNavigate(href)}
            className="group flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[#f8fafc] active:bg-[#f1f5f9]"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: i < SETUP_LINKS.length - 1
                ? '0.5px solid rgba(0,0,0,0.05)'
                : 'none',
            }}
          >
            <span
              className="text-[13px] font-medium"
              style={{ color: '#374151' }}
            >
              {label}
            </span>
            <ChevronRight
              size={14}
              className="transition-colors"
              style={{ color: '#d1d5db' }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}