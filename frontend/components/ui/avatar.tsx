import { cn } from '@/lib/design/cn'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  xs: 'h-5 w-5 text-2xs',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: Size
  className?: string
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover shrink-0 border border-line-2', sizes[size], className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full shrink-0 select-none font-medium',
        'bg-raised text-ink-2 border border-line-2',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
