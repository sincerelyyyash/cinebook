import { PageHeader } from '@/components/shell/dashboard-shell'
import { EmptyState } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/badge'

/** Reusable stub for admin sections not yet built out in this phase. */
export function AdminPlaceholder({
  title,
  description,
  icon,
  detail,
  phase,
}: {
  title: string
  description: string
  icon: React.ElementType
  detail: string
  phase: string
}) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<Badge variant="accent" size="md">{phase}</Badge>} />
      <div className="p-6">
        <div className="rounded-xl border border-line-2 bg-surface">
          <EmptyState icon={icon} title={`${title} · coming in ${phase}`} description={detail} />
        </div>
      </div>
    </>
  )
}
