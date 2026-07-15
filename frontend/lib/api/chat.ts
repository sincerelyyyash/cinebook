'use client'

import { api } from './client'

/** A conversation in the sidebar list. */
export interface ConversationSummary {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

/** A persisted message (user/assistant text only; tool steps aren't stored). */
export interface StoredMessage {
  role: 'user' | 'assistant'
  text: string
  at: string
}

export interface ConversationDetail {
  id: string
  title: string | null
  createdAt: string
  messages: StoredMessage[]
}

export function listConversations() {
  return api.get<ConversationSummary[]>('/chat/conversations')
}

export function getConversation(id: string) {
  return api.get<ConversationDetail>(`/chat/conversations/${id}`)
}
