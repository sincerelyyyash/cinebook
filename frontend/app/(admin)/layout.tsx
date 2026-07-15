import { requireRole } from '@/lib/auth/guard'
import { SessionProvider } from '@/lib/auth/session'
import { DashboardShell } from '@/components/shell/dashboard-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('ADMIN')
  return (
    <SessionProvider user={user}>
      <DashboardShell section="admin">{children}</DashboardShell>
    </SessionProvider>
  )
}
