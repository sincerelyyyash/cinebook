'use client'

import { marked } from 'marked'
import { memo, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/design/cn'

/**
 * Streaming-friendly markdown. Adapted from a reference chat implementation: we
 * split the text into top-level blocks with marked's lexer and memoize each
 * block, so during token streaming only the final block re-renders (the earlier
 * blocks are stable). This keeps long, streaming replies smooth.
 *
 * Trimmed for CineBook: GFM (tables/lists) only — no math/syntax-highlighting.
 */

const components: Components = {
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-2">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const inline = !className
    if (inline) {
      return <code className="rounded bg-raised px-1 py-0.5 text-[0.85em] font-mono text-ink">{children}</code>
    }
    return (
      <pre className="my-2 overflow-x-auto scroll-thin rounded-lg bg-canvas border border-line-2 p-3 text-xs">
        <code className="font-mono text-ink-2">{children}</code>
      </pre>
    )
  },
}

const MarkdownBlock = memo(
  ({ content }: { content: string }) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  ),
  (prev, next) => prev.content === next.content,
)
MarkdownBlock.displayName = 'MarkdownBlock'

export const Markdown = memo(function Markdown({ content, id, className }: { content: string; id: string; className?: string }) {
  const blocks = useMemo(() => {
    try {
      return marked.lexer(content).map((t) => t.raw)
    } catch {
      return [content]
    }
  }, [content])

  return (
    <div className={cn('chat-prose', className)}>
      {blocks.map((block, i) => (
        <MarkdownBlock content={block} key={`${id}-b${i}`} />
      ))}
    </div>
  )
})
