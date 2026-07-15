import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { roleHome } from '@/lib/auth/roles'

/** Root: send each user to their role's home, or to login. */
export default async function RootPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  redirect(roleHome[user.role])
}
