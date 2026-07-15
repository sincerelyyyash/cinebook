import { requireRole } from '@/lib/auth/guard'
import { SessionProvider } from '@/lib/auth/session'
import { StorefrontShell } from '@/components/shell/storefront-shell'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('CUSTOMER')
  return (
    <SessionProvider user={user}>
      <StorefrontShell>{children}</StorefrontShell>
    </SessionProvider>
  )
}
