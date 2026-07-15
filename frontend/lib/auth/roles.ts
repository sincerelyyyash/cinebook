import type { Role } from '@/lib/types'

/** The home route for each role after login. */
export const roleHome: Record<Role, string> = {
  CUSTOMER: '/movies',
  HALL_MANAGER: '/schedule',
  ADMIN: '/overview',
}

/** Route-group prefixes each role is allowed to access. */
export const roleAccess: Record<Role, string[]> = {
  CUSTOMER: ['/movies', '/shows', '/checkout', '/bookings', '/chat'],
  HALL_MANAGER: ['/schedule'],
  ADMIN: [
    '/overview',
    '/users',
    '/catalog',
    '/theatres',
    '/screens',
    '/scheduling',
    '/promos',
    '/reports',
    '/activity',
  ],
}

export function canAccess(role: Role, pathname: string): boolean {
  return roleAccess[role].some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}
