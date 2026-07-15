'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/lib/types'

/**
 * Client-side session context. The authenticated user is resolved on the server
 * (middleware + a /me RSC fetch) and passed into role-group layouts, which wrap
 * their subtree in this provider. Client components read it via useUser().
 */
const SessionContext = createContext<User | null>(null)

export function SessionProvider({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
}

export function useUser(): User {
  const user = useContext(SessionContext)
  if (!user) throw new Error('useUser must be used within an authenticated route group')
  return user
}

/** Non-throwing variant for optional-auth surfaces. */
export function useMaybeUser(): User | null {
  return useContext(SessionContext)
}
