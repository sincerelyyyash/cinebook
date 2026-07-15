import { requireRole } from '@/lib/auth/guard'
import { SessionProvider } from '@/lib/auth/session'
import { DashboardShell } from '@/components/shell/dashboard-shell'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  // Admins can also view manager screens (override powers) — allow both.
  const user = await requireRole('HALL_MANAGER', 'ADMIN')
  return (
    <SessionProvider user={user}>
      <DashboardShell section="manager">{children}</DashboardShell>
    </SessionProvider>
  )
}
