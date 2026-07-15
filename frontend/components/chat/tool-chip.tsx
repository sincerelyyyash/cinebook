'use client'

import { motion } from 'framer-motion'
import { Check, CircleNotch, X } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { toolMeta, isSubAgent } from '@/lib/chat-tools'

export type ToolStatus = 'running' | 'done' | 'failed'

export interface ToolActivity {
  id: string
  tool: string
  status: ToolStatus
}

/**
 * A single tool-activity chip — the visible trace of the agent's work. The
 * `delegate_booking` handoff renders as a distinct "Booking assistant" chip to
 * show task decomposition.
 */
export function ToolChip({ activity }: { activity: ToolActivity }) {
  const meta = toolMeta(activity.tool)
  const Icon = meta.icon
  const running = activity.status === 'running'
  const failed = activity.status === 'failed'
  const sub = isSubAgent(activity.tool)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className={cn(
        'inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2 rounded-full border text-xs',
        sub
          ? 'bg-accent-bg text-accent border-line-2'
          : 'bg-surface text-ink-2 border-line-2',
        failed && 'text-danger-ink',
      )}
    >
      <span className="inline-flex items-center justify-center h-4 w-4 shrink-0">
        {running ? (
          <CircleNotch size={12} className="animate-spin-slow" />
        ) : failed ? (
          <X size={12} />
        ) : sub ? (
          <Icon size={12} />
        ) : (
          <Check size={12} className="text-positive-ink" />
        )}
      </span>
      <span className="truncate">{running ? meta.active : meta.done}</span>
      {running && !sub && <Icon size={11} className="text-ink-dim shrink-0" />}
    </motion.div>
  )
}
