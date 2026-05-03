'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { Term } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeTerm, setActiveTerm } = useTermStore()

  // Eagerly fetch terms so the topbar badge is populated on every page load
  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
    staleTime: 5 * 60 * 1000, // 5 min — shared with modal, no double fetch
  })

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const current = terms.find((t: Term) => t.is_current) ?? terms[0]
      setActiveTerm(current)
    }
  }, [terms, activeTerm, setActiveTerm])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-60">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-3 sm:p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}