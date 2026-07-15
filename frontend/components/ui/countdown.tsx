'use client'

import { motion } from 'framer-motion'
import { Clock } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { useCountdown } from '@/lib/hooks/use-countdown'
import { formatCountdown } from '@/lib/format/datetime'

/**
 * Seat-hold countdown pill. Turns danger-colored under 60s. Fires onExpire once.
 */
export function Countdown({
  expiresAt,
  onExpire,
  className,
}: {
  expiresAt: string | Date | null
  onExpire?: () => void
  className?: string
}) {
  const { secondsLeft, expired } = useCountdown(expiresAt, onExpire)
  const urgent = secondsLeft <= 60 && !expired

  return (
    <motion.span
      animate={urgent ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={urgent ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-mono tabular-nums border',
        expired
          ? 'status-danger border-danger-bg'
          : urgent
            ? 'status-warning border-warning-bg'
            : 'bg-surface text-ink-2 border-line-2',
        className,
      )}
    >
      <Clock size={12} />
      {expired ? 'Hold expired' : formatCountdown(secondsLeft)}
    </motion.span>
  )
}
