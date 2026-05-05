'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottonNav'
import type { Term } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeTerm, setActiveTerm } = useTermStore()

  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const current = terms.find((t: Term) => t.is_current) ?? terms[0]
      setActiveTerm(current)
    }
  }, [terms, activeTerm, setActiveTerm])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — desktop always visible, mobile overlay via sidebarOpen */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="lg:pl-60">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />

        {/* Extra bottom padding on mobile so content clears the bottom nav.
            On lg+ the bottom nav is hidden so no extra padding needed.      */}
        <main className="p-3 sm:p-4 lg:p-6 min-w-0 pb-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile-only bottom navigation */}
      <BottomNav />
    </div>
  )
}