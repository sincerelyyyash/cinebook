import { cookies } from 'next/headers'
import { backendApiBase, devFakeAuth } from '@/lib/env'
import type { Role, User } from '@/lib/types'

export const SESSION_COOKIE = 'cb_session'
export const ROLE_COOKIE = 'cb_role'

/** Backend UserProfile shape (auth/me). */
interface UserProfile {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  role: Role
  isActive: boolean
  preferences: Record<string, unknown> | null
}

/**
 * Resolve the authenticated user server-side: read the session cookie and call
 * the backend `GET /api/auth/me`. Returns null when unauthenticated/unreachable.
 *
 * DEV FALLBACK (NEXT_PUBLIC_DEV_FAKE_AUTH=1): preview the shells with a mock
 * user whose role comes from the cb_role cookie — no backend needed.
 */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies()

  if (devFakeAuth) {
    const role = (store.get(ROLE_COOKIE)?.value as Role) || 'CUSTOMER'
    return devUser(role)
  }

  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const res = await fetch(`${backendApiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: UserProfile }
    return toUser(json.data)
  } catch {
    return null
  }
}

function toUser(p: UserProfile): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phoneNumber ?? '',
    role: p.role,
    isActive: p.isActive,
    preferences: p.preferences,
  }
}

function devUser(role: Role): User {
  const byRole: Record<Role, { id: string; name: string; phone: string }> = {
    CUSTOMER: { id: 'dev-customer', name: 'Demo Customer', phone: '+91 90000 00003' },
    HALL_MANAGER: { id: 'dev-manager', name: 'Demo Manager', phone: '+91 90000 00002' },
    ADMIN: { id: 'dev-admin', name: 'Demo Admin', phone: '+91 90000 00001' },
  }
  return { ...byRole[role], email: null, role, isActive: true, preferences: null }
}
