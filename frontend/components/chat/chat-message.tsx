'use client'

import { motion } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Markdown } from './markdown'
import { ToolTrace } from './tool-trace'
import type { ToolActivity } from './tool-chip'

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools?: ToolActivity[]
  streaming?: boolean
}

/** One chat turn. User messages are bubbles; assistant is avatar + markdown. */
export function ChatMessage({ message }: { message: ChatMsg }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-bg border border-line-2 px-3.5 py-2 text-sm text-ink whitespace-pre-wrap">
          {message.text}
        </div>
      </motion.div>
    )
  }

  const hasTools = message.tools && message.tools.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex gap-3"
    >
      <span className="mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent text-accent-ink shrink-0">
        <Sparkle size={14} />
      </span>
      <div className="min-w-0 flex-1 flex flex-col gap-2 pt-0.5">
        {hasTools && <ToolTrace tools={message.tools!} streaming={message.streaming} />}
        {message.text ? (
          <div className="text-ink">
            <Markdown content={message.text} id={message.id} />
            {message.streaming && <StreamingCursor />}
          </div>
        ) : message.streaming && !hasTools ? (
          <ThinkingDots />
        ) : null}
      </div>
    </motion.div>
  )
}

function StreamingCursor() {
  return <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 rounded-sm bg-accent animate-pulse" />
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink-3"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}
