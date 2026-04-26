import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Term, AuthUser } from '@/types'

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
        localStorage.setItem('timetabler_token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('timetabler_token')
        document.cookie = 'timetabler_token=; Max-Age=0; path=/'
        set({ token: null, user: null })
        window.location.href = '/login'
      },
    }),
    { name: 'timetabler-auth' }
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
