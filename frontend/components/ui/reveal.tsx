import { cn } from '@/lib/design/cn'

/**
 * Soft fade + rise on mount, staggered by `index`. Pure CSS (`.animate-enter`
 * keyframe), so it works inside Server Components and is disabled automatically
 * under prefers-reduced-motion. Wrap list/grid items with an index for a gentle
 * cascade.
 */
export function Reveal({
  index = 0,
  step = 35,
  className,
  children,
  as: Tag = 'div',
}: {
  index?: number
  step?: number
  className?: string
  children: React.ReactNode
  as?: 'div' | 'li' | 'section' | 'tr'
}) {
  return (
    <Tag
      className={cn('animate-enter', className)}
      style={{ animationDelay: `${Math.min(index * step, 400)}ms` }}
    >
      {children}
    </Tag>
  )
}
