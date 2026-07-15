import { cn } from '@/lib/design/cn'

/** Loading placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

/** Empty / no-data state. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      {Icon && (
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-surface border border-line-2 text-ink-3">
          <Icon size={20} />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-2 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** A live "connected" indicator dot. */
export function LiveDot({ label = 'Live', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-ink-2', className)}>
      <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-positive-ink text-positive-ink" />
      {label}
    </span>
  )
}
