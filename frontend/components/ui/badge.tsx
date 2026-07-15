import { cn } from '@/lib/design/cn'
import type { BookingStatus, PaymentStatus, Role, ShowStatus } from '@/lib/types'

type BadgeVariant = 'neutral' | 'positive' | 'warning' | 'danger' | 'info' | 'accent'
type BadgeSize = 'xs' | 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface text-ink-2 border border-line-2',
  positive: 'bg-positive-bg text-positive-ink border border-positive-bg',
  warning: 'bg-warning-bg text-warning-ink border border-warning-bg',
  danger: 'bg-danger-bg text-danger-ink border border-danger-bg',
  info: 'bg-info-bg text-info-ink border border-info-bg',
  accent: 'bg-accent-bg text-accent border border-line-2',
}

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-3',
  positive: 'bg-positive-ink',
  warning: 'bg-warning-ink',
  danger: 'bg-danger-ink',
  info: 'bg-info-ink',
  accent: 'bg-accent',
}

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'h-4 px-1.5 text-2xs gap-1 rounded-sm',
  sm: 'h-5 px-2 text-xs gap-1 rounded-sm',
  md: 'h-6 px-2.5 text-xs gap-1.5 rounded',
}

export function Badge({ variant = 'neutral', size = 'sm', dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium tracking-wide uppercase select-none whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

/* ── Domain status helpers ─────────────────────────────────────────────────── */

const bookingVariant: Record<BookingStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'positive',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
  REFUNDED: 'info',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={bookingVariant[status]} dot>{status}</Badge>
}

const paymentVariant: Record<PaymentStatus, BadgeVariant> = {
  INITIATED: 'neutral',
  PROCESSING: 'info',
  SUCCEEDED: 'positive',
  FAILED: 'danger',
  REFUNDED: 'info',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentVariant[status]} dot>{status}</Badge>
}

const showVariant: Record<ShowStatus, BadgeVariant> = {
  SCHEDULED: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'neutral',
}

export function ShowStatusBadge({ status }: { status: ShowStatus }) {
  return <Badge variant={showVariant[status]}>{status}</Badge>
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={role === 'ADMIN' ? 'accent' : 'neutral'}>{role.replace('_', ' ')}</Badge>
}
