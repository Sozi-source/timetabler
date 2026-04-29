'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store'
import { saveToken } from '@/lib/auth'
import api from '@/lib/api'
import type { AuthUser } from '@/types'
import { Calendar, Loader2 } from 'lucide-react'

export default function LoginPage() {
  // No useRouter — we use window.location.href after login to avoid
  // racing Zustand's async persist flush (the root cause of the auth bug).
  const { setAuth } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1 — Get token from Django
      const loginRes = await api.post('/auth/login/', { username, password })
      const token: string = loginRes.data.data?.token ?? loginRes.data.token

      // Step 2 — Write token to localStorage + cookie BEFORE anything else.
      // The Axios interceptor reads localStorage on every request, so the
      // next call (/auth/me/) will automatically be authenticated.
      saveToken(token)

      // Step 3 — Fetch user profile (interceptor picks up token automatically)
      const meRes = await api.get<{ ok: boolean; data: AuthUser }>('/auth/me/')
      const user = meRes.data.data

      // Step 4 — Commit to Zustand store (persist middleware syncs async)
      setAuth(token, user)

      // Step 5 — Hard navigate via window.location.href, NOT router.push().
      //
      // router.push() is a client-side SPA transition — the new page shares
      // the same JS runtime and may read Zustand before persist has flushed.
      // window.location.href forces a full browser navigation: the new page
      // boots fresh, reads from localStorage (already written in Step 2),
      // and hydrates Zustand correctly. This eliminates the race condition.
      const destination =
        user.is_staff || user.role === "ADMIN" || (user.groups ?? []).includes('Coordinator')
          ? '/dashboard'
          : '/dashboard/trainer'

      window.location.href = destination

      // Note: do NOT call setLoading(false) on success — the page is
      // navigating away, so keeping the spinner running gives better UX.

    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ??
        'Invalid credentials'
      setError(msg)
      setLoading(false) // only reset loading on failure
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="rounded-2xl bg-white shadow-2xl p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a5f]">
            <Calendar className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Timetabler</h1>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#162d4a] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50 disabled:opacity-60 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        TVET College Timetabling System
      </p>
    </div>
  )
}





