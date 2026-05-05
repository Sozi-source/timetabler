'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
    match: (p: string) => p === '/dashboard' || p === '/',
  },
  {
    label: 'Timetable',
    href: '/timetable',
    icon: CalendarDays,
    match: (p: string) => p.startsWith('/timetable') || p.startsWith('/conflicts'),
  },
  {
    label: 'Cohorts',
    href: '/setup/cohorts',
    icon: Users,
    match: (p: string) => p.startsWith('/setup/cohorts'),
  },
  {
    label: 'Setup',
    href: '/setup/institution',
    icon: Settings,
    match: (p: string) =>
      p.startsWith('/setup') && !p.startsWith('/setup/cohorts'),
  },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <>
      {/* Safe-area spacer so content isn't hidden behind the nav */}
      <div className="h-16 lg:hidden" aria-hidden />

      <nav
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ label, href, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95',
                  'border-none bg-transparent cursor-pointer relative'
                )}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active indicator pill at top */}
                <span
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-200',
                    active ? 'w-6 bg-[#1e3a5f]' : 'w-0 bg-transparent'
                  )}
                />

                {/* Icon */}
                <span
                  className={cn(
                    'flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-150',
                    active
                      ? 'bg-[#1e3a5f]/8'
                      : 'bg-transparent'
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={cn(
                      'transition-colors duration-150 shrink-0',
                      active ? 'text-[#1e3a5f]' : 'text-gray-400'
                    )}
                  />
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none tracking-wide transition-colors duration-150',
                    active ? 'text-[#1e3a5f] font-semibold' : 'text-gray-400'
                  )}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}