'use client'

import { useRef, useState, useCallback } from 'react'
import { StickToBottom } from 'use-stick-to-bottom'
import { Sparkle } from '@phosphor-icons/react/ssr'
import { ChatMessage, type ChatMsg } from './chat-message'
import { ChatComposer } from './chat-composer'
import { streamChat } from '@/lib/realtime/sse-client'
import type { ToolActivity } from './tool-chip'

const SUGGESTIONS = [
  'What sci-fi movies are playing this weekend?',
  'Find theatres showing something tonight with recliner seats',
  'Book 2 tickets for a trending movie',
  'Are there any offers I can use?',
]

let uid = 0
const nextId = () => `m${++uid}`

/**
 * The chat conversation surface: streaming messages, visible tool activity, and
 * the composer. Reused by the full page and the drawer. Manages one
 * conversation; `onConversation` reports the id the backend assigns.
 */
export function ChatPanel({
  conversationId,
  initialMessages = [],
  onConversation,
}: {
  conversationId?: string
  initialMessages?: ChatMsg[]
  onConversation?: (id: string) => void
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const convRef = useRef<string | undefined>(conversationId)
  const abortRef = useRef<AbortController | null>(null)
  const activeIdRef = useRef<string | null>(null)

  const patchAssistant = useCallback((fn: (m: ChatMsg) => ChatMsg) => {
    const id = activeIdRef.current
    if (!id) return
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      const userMsg: ChatMsg = { id: nextId(), role: 'user', text: trimmed }
      const assistantId = nextId()
      activeIdRef.current = assistantId
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', text: '', tools: [], streaming: true },
      ])
      setInput('')
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      await streamChat({
        conversationId: convRef.current,
        message: trimmed,
        signal: controller.signal,
        onEvent: (e) => {
          switch (e.type) {
            case 'tool_start':
              patchAssistant((m) => ({
                ...m,
                tools: [...(m.tools ?? []), { id: nextId(), tool: e.tool, status: 'running' } as ToolActivity],
              }))
              break
            case 'tool_end':
              patchAssistant((m) => {
                const tools = [...(m.tools ?? [])]
                for (let i = tools.length - 1; i >= 0; i--) {
                  if (tools[i].tool === e.tool && tools[i].status === 'running') {
                    tools[i] = { ...tools[i], status: e.ok ? 'done' : 'failed' }
                    break
                  }
                }
                return { ...m, tools }
              })
              break
            case 'conversation':
              convRef.current = e.conversationId
              onConversation?.(e.conversationId)
              break
            case 'token':
              patchAssistant((m) => ({ ...m, text: m.text + e.text }))
              break
            case 'done':
              patchAssistant((m) => ({ ...m, streaming: false }))
              break
            case 'error':
              patchAssistant((m) => ({
                ...m,
                streaming: false,
                text: m.text || `⚠️ ${e.message}`,
              }))
              break
          }
        },
      }).catch(() => {
        patchAssistant((m) => ({ ...m, streaming: false }))
      })

      setStreaming(false)
      abortRef.current = null
    },
    [streaming, patchAssistant, onConversation],
  )

  function stop() {
    abortRef.current?.abort()
    setStreaming(false)
    patchAssistant((m) => ({ ...m, streaming: false }))
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      <StickToBottom className="flex-1 min-h-0 relative overflow-hidden" resize="smooth" initial="smooth">
        <StickToBottom.Content className="flex flex-col gap-5 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
          {empty ? (
            <EmptyState onPick={(s) => send(s)} />
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          )}
        </StickToBottom.Content>
      </StickToBottom>

      <div className="shrink-0 border-t border-line bg-page/80 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-3">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            onStop={stop}
            streaming={streaming}
          />
          <p className="text-2xs text-ink-dim text-center mt-2">
            CineBook Assistant can search, hold seats, and complete bookings for you.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-10">
      <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-accent text-accent-ink">
        <Sparkle size={22} />
      </span>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">How can I help you book?</h2>
        <p className="text-sm text-ink-2 mt-1">Ask in plain language and I’ll handle the search, seats, and checkout.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-sm text-ink-2 rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 hover:border-line-strong hover:text-ink transition-colors-fast"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
