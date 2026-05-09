/**
 * useActiveTerm
 * ─────────────
 * Returns the active Term, guaranteed, even on page refresh.
 *
 * Priority:
 *   1. useTermStore().activeTerm  — set by Topbar during normal navigation
 *   2. GET /api/terms/ → is_current=true term
 *   3. GET /api/terms/ → terms[0] as last resort
 *
 * Also writes back into the store so subsequent renders and other
 * components that read useTermStore() see the resolved value.
 *
 * Root cause this fixes:
 *   useTermStore has NO persist middleware, so activeTerm is null on every
 *   fresh page load / direct-link navigation. Pages that guard their fetch
 *   with `enabled: !!termId` then never fire at all — blank screen.
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import type { Term } from '@/types'
import api from '@/lib/api'

export function useActiveTerm(): {
  term: Term | null
  termId: string
  isLoading: boolean
} {
  const { activeTerm, setActiveTerm } = useTermStore()

  // Only hit the network when the store is empty.
  const { data: terms, isLoading } = useQuery<Term[]>({
    queryKey:  ['terms'],
    queryFn:   () => api.get('/terms/').then(r => r.data.data as Term[]),
    enabled:   !activeTerm,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  // Push the resolved term into the store so Topbar and other components stay in sync.
  useEffect(() => {
    if (activeTerm || !terms?.length) return
    const resolved = terms.find(t => t.is_current) ?? terms[0]
    if (resolved) setActiveTerm(resolved)
  }, [terms, activeTerm, setActiveTerm])

  const term   = activeTerm ?? terms?.find(t => t.is_current) ?? terms?.[0] ?? null
  const termId = term?.id ?? ''

  return {
    term,
    termId,
    isLoading: !activeTerm && isLoading,
  }
}
