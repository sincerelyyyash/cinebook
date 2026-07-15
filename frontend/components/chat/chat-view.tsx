'use client'

import { useEffect, useState, useCallback } from 'react'
import { Chat, CircleNotch, Plus } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { ChatPanel } from './chat-panel'
import type { ChatMsg } from './chat-message'
import { listConversations, getConversation, type ConversationSummary } from '@/lib/api/chat'

/** Full-page assistant: a conversations rail + the streaming chat panel. */
export function ChatView() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [initial, setInitial] = useState<ChatMsg[]>([])
  const [panelKey, setPanelKey] = useState(0)
  const [loadingConv, setLoadingConv] = useState(false)

  const refreshList = useCallback(async () => {
    setConversations(await listConversations().catch(() => []))
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  async function openConversation(id: string) {
    if (id === activeId) return
    setLoadingConv(true)
    try {
      const conv = await getConversation(id)
      const msgs: ChatMsg[] = conv.messages.map((m, i) => ({
        id: `${id}-${i}`,
        role: m.role,
        text: m.text,
      }))
      setInitial(msgs)
      setActiveId(id)
      setPanelKey((k) => k + 1)
    } finally {
      setLoadingConv(false)
    }
  }

  function newChat() {
    setInitial([])
    setActiveId(undefined)
    setPanelKey((k) => k + 1)
  }

  function handleConversation(id: string) {
    if (id !== activeId) {
      setActiveId(id)
      void refreshList()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Conversations rail */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-line bg-canvas">
        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-accent text-accent-ink text-sm font-medium hover:bg-accent-2 transition-colors-fast"
          >
            <Plus size={15} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-2 flex flex-col gap-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-ink-3 px-2 py-3">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={cn(
                  'flex items-center gap-2 h-9 px-2.5 rounded-md text-sm text-left transition-colors-fast',
                  c.id === activeId ? 'bg-selected text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink',
                )}
              >
                <Chat size={14} className="shrink-0 text-ink-3" />
                <span className="truncate">{c.title || 'New conversation'}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat surface */}
      <div className="flex-1 min-w-0 relative">
        {loadingConv && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-page/60">
            <CircleNotch size={20} className="animate-spin-slow text-ink-3" />
          </div>
        )}
        <ChatPanel key={panelKey} conversationId={activeId} initialMessages={initial} onConversation={handleConversation} />
      </div>
    </div>
  )
}
