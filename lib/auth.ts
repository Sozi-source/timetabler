/**
 * After login, write token to both localStorage (for Axios)
 * and a cookie (for the middleware edge runtime).
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