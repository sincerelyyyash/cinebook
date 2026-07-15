'use client'

/** Clear the session (best-effort backend revoke via the BFF) and go to login. */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/session', { method: 'DELETE' })
  } catch {
    /* ignore — we redirect regardless */
  }
  // Full navigation so server components re-resolve the (now absent) session.
  window.location.href = '/login'
}
