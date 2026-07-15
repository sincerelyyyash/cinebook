'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretRight, Check, CircleNotch, X } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { toolMeta, isSubAgent } from '@/lib/chat-tools'
import type { ToolActivity, ToolStatus } from './tool-chip'

/**
 * The agent's work, shown as ONE self-updating control instead of a chip per
 * tool call (an agent can run dozens — that wall of pills is noise).
 *
 *  · While working → a single pill: spinner + the current action, its label
 *    crossfading in place as each tool runs.
 *  · When finished → a quiet "Worked through N steps" summary that expands to a
 *    de-duplicated timeline ("Checked seats ×12") for anyone who wants detail.
 *
 * Same behaviour on phone and desktop.
 */
export function ToolTrace({ tools, streaming }: { tools: ToolActivity[]; streaming?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!tools.length) return null

  // The active step is the latest one still running (agents run sequentially).
  const running = streaming ? [...tools].reverse().find((t) => t.status === 'running') : undefined

  // ── Working: one live line that updates ──────────────────────────────────
  if (running) {
    const meta = toolMeta(running.tool)
    const sub = isSubAgent(running.tool)
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 h-7 self-start rounded-full border pl-2 pr-3 text-xs',
          sub ? 'border-line-2 bg-accent-bg text-accent' : 'border-line-2 bg-surface text-ink-2',
        )}
      >
        <CircleNotch size={13} className="shrink-0 animate-spin-slow" />
        {/* Keyed remount → a quick fade on each change; no exit to queue, so it
            stays in step even when tools fire faster than an animation cycle. */}
        <motion.span
          key={running.tool}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14 }}
          className="truncate"
        >
          {meta.active}
        </motion.span>
      </div>
    )
  }

  // ── Finished: one collapsible summary ────────────────────────────────────
  const groups = aggregate(tools)
  const n = tools.length
  // Only read the whole run as failed when *every* call failed — a single failed
  // call among many (agents retry constantly) is not an overall failure.
  const allFailed = tools.every((t) => t.status === 'failed')

  return (
    <div className="flex max-w-full flex-col self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex h-7 items-center gap-2 self-start rounded-full border pl-2 pr-2.5 text-xs transition-colors-fast',
          'border-line-2 bg-surface hover:border-line-strong',
          allFailed ? 'text-danger-ink' : 'text-ink-2 hover:text-ink',
        )}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          {allFailed ? (
            <X size={12} className="text-danger-ink" />
          ) : (
            <Check size={12} className="text-positive-ink" />
          )}
        </span>
        <span>
          Worked through {n} step{n === 1 ? '' : 's'}
        </span>
        <CaretRight size={11} className={cn('text-ink-dim transition-transform', open && 'rotate-90')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="ml-1 mt-1.5 flex flex-col gap-0.5 overflow-hidden border-l border-line pl-3"
          >
            {groups.map((g, i) => {
              const meta = toolMeta(g.tool)
              const Icon = meta.icon
              const failed = g.status === 'failed'
              return (
                <li key={i} className="flex items-center gap-2 py-0.5 text-xs text-ink-3">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    {failed ? (
                      <X size={11} className="text-danger-ink" />
                    ) : (
                      <Icon size={12} className={isSubAgent(g.tool) ? 'text-accent' : 'text-ink-dim'} />
                    )}
                  </span>
                  <span className="truncate">{meta.done}</span>
                  {g.count > 1 && <span className="shrink-0 text-ink-dim tabular-nums">×{g.count}</span>}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Collapse repeated calls of the same tool into one row with a count. */
function aggregate(tools: ToolActivity[]): { tool: string; count: number; status: ToolStatus }[] {
  const order: string[] = []
  const map = new Map<string, { tool: string; count: number; failed: number }>()
  for (const t of tools) {
    const g = map.get(t.tool)
    if (g) {
      g.count++
      if (t.status === 'failed') g.failed++
    } else {
      map.set(t.tool, { tool: t.tool, count: 1, failed: t.status === 'failed' ? 1 : 0 })
      order.push(t.tool)
    }
  }
  // A row only reads as failed when *all* of its repeats failed; if even one of
  // the retries succeeded, the tool ultimately worked.
  return order.map((k) => {
    const g = map.get(k)!
    return { tool: g.tool, count: g.count, status: g.failed === g.count ? 'failed' : 'done' }
  })
}
