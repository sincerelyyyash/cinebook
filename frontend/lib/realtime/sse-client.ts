import { bffBase } from '@/lib/env'

/**
 * Chat streaming client. POSTs a message to the backend agent loop (custom, no
 * frameworks) and consumes its Server-Sent Events over the same-origin BFF.
 *
 * Backend events (src/chatbot/chatbot.controller.ts):
 *   { type: 'tool_start', tool }         — agent invoked a tool
 *   { type: 'tool_end',   tool, ok }     — tool finished
 *   { type: 'conversation', conversationId }
 *   { type: 'token', text }              — reply text chunk
 *   { type: 'done', conversationId }
 *   { type: 'error', message }
 *
 * Delegation to the booking sub-agent surfaces as the `delegate_booking` tool.
 */

export type ChatStreamEvent =
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_end'; tool: string; ok: boolean }
  | { type: 'conversation'; conversationId: string }
  | { type: 'token'; text: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string }

export interface StreamChatArgs {
  conversationId?: string
  message: string
  signal?: AbortSignal
  onEvent: (e: ChatStreamEvent) => void
}

export async function streamChat({
  conversationId,
  message,
  signal,
  onEvent,
}: StreamChatArgs): Promise<void> {
  const res = await fetch(`${bffBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    credentials: 'include',
    body: JSON.stringify({ conversationId, message, stream: true }),
    signal,
  })

  if (res.status === 429) {
    onEvent({ type: 'error', message: "You're sending messages quickly. Please wait a moment and try again." })
    return
  }
  if (!res.ok || !res.body) {
    onEvent({ type: 'error', message: 'Chat is unavailable right now. Please try again.' })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        onEvent(JSON.parse(payload) as ChatStreamEvent)
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
