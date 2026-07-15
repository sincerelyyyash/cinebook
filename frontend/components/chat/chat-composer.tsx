'use client'

import { useRef, useEffect } from 'react'
import { ArrowUp, Square } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'

/** Auto-growing chat input. Enter sends; Shift+Enter adds a newline. */
export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop?: () => void
  streaming?: boolean
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming && value.trim()) onSend()
    }
  }

  const canSend = value.trim().length > 0 && !streaming && !disabled

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-line-2 bg-field p-2 focus-within:border-accent transition-colors-fast">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about movies, showtimes, or book tickets…"
        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none scroll-thin max-h-40"
      />
      {streaming && onStop ? (
        <button
          onClick={onStop}
          className="interactive h-8 w-8 rounded-xl bg-surface border border-line-2 flex items-center justify-center text-ink-2 hover:text-ink shrink-0"
          aria-label="Stop"
        >
          <Square size={14} weight="fill" />
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!canSend}
          className={cn(
            'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors-fast',
            canSend ? 'bg-accent text-accent-ink hover:bg-accent-2' : 'bg-surface text-ink-3 border border-line-2 cursor-not-allowed',
          )}
          aria-label="Send"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </div>
  )
}
