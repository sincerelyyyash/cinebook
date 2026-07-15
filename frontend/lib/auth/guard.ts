import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { roleHome } from '@/lib/auth/roles'
import type { Role, User } from '@/lib/types'

/**
 * Server-side guard for role-group layouts. Ensures a user is signed in and has
 * one of the allowed roles; otherwise redirects to login or the user's own home.
 * Returns the resolved user for the layout to hand to SessionProvider.
 */
export async function requireRole(...allowed: Role[]): Promise<User> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!allowed.includes(user.role)) redirect(roleHome[user.role])
  return user
}
