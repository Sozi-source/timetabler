/**
 * After login, write token to both localStorage (for Axios interceptor)
 * and a cookie (for middleware / edge runtime).
 * This is the single source of truth for raw token persistence.
 */
export function saveToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('timetabler_token', token)
  document.cookie = `timetabler_token=${token}; path=/; SameSite=Lax`
}

export function clearToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('timetabler_token')
  document.cookie = 'timetabler_token=; Max-Age=0; path=/'
}