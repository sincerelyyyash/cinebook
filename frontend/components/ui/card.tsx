import { cn } from '@/lib/design/cn'

/** Standard surface card. */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl bg-surface border border-line-2 elevated-xs', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Titled panel container (chart/table wrapper). */
export function Panel({
  title,
  hint,
  right,
  className,
  children,
}: {
  title: string
  hint?: string
  right?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl bg-surface border border-line-2 elevated-xs', className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink truncate">{title}</h3>
          {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/** Hero metric tile for dashboards. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon?: React.ElementType
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4 p-5 rounded-xl bg-surface border border-line-2 elevated-xs', className)}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-label truncate">{label}</span>
        {Icon && <Icon size={15} className="text-ink-dim shrink-0" />}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-4xl font-mono font-medium text-ink leading-none tracking-tight tabular-nums">{value}</span>
        {sub && <span className="text-xs text-ink-3 mt-1">{sub}</span>}
      </div>
    </div>
  )
}
