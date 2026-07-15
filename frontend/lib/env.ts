/**
 * Environment access. NEXT_PUBLIC_* values are inlined at build time and safe
 * on the client; API_BASE_URL is server-only.
 *
 * The backend mounts every route under `/api`. Browser calls go same-origin to
 * the Next BFF (`/api/bff/*`) so the httpOnly session cookie rides along and we
 * sidestep CORS; server (RSC) calls hit the backend origin directly.
 */

export const isServer = typeof window === 'undefined'

/** Backend origin (no /api). Server-only value falls back to the public one. */
export const backendOrigin =
  (isServer ? process.env.API_BASE_URL : undefined) ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:4000'

/** Route prefix the backend mounts everything under. */
export const API_PREFIX = '/api'

/** Absolute backend API base for server-side fetches, e.g. http://localhost:4000/api */
export const backendApiBase = `${backendOrigin}${API_PREFIX}`

/** Same-origin BFF base the browser talks to. */
export const bffBase = '/api/bff'

/** WebSocket URL for live seat availability (backend serves it at /ws). */
export const wsUrl = (() => {
  const explicit = process.env.NEXT_PUBLIC_WS_URL
  if (explicit) return explicit.replace(/\/$/, '') + '/ws'
  const origin = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  return origin.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'
})()

export const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'CineBook'

/** Dev-only preview auth (mock user, no backend). Off once real auth is wired. */
export const devFakeAuth = process.env.NEXT_PUBLIC_DEV_FAKE_AUTH === '1'
