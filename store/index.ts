import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Term, AuthUser } from '@/types'
import { clearToken } from '@/lib/auth'

// ── Auth Store ────────────────────────────────────────────────
interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: (token, user) => {
        // DO NOT write to localStorage here — saveToken() in login/page.tsx
        // already handled it before setAuth is called. The persist middleware
        // will also sync it. Triple-writing caused the race condition.
        set({ token, user })
      },

      logout: () => {
        clearToken() // clears localStorage + cookie in one call
        set({ token: null, user: null })
        window.location.href = '/login'
      },
    }),
    {
      name: 'timetabler-auth',
      // Only persist token + user — nothing else needed
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

// ── Term Store ────────────────────────────────────────────────
interface TermState {
  activeTerm: Term | null
  setActiveTerm: (term: Term) => void
}

export const useTermStore = create<TermState>((set) => ({
  activeTerm: null,
  setActiveTerm: (term) => set({ activeTerm: term }),
}))