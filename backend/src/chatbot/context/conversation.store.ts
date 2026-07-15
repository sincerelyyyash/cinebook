import { prisma } from '../../infra/prisma.ts';
import { Errors } from '../../lib/errors.ts';
import type { ChatMessage } from '../llm/types.ts';

/**
 * Conversation persistence. We store only cross-turn history — the `user`
 * messages and the assistant's FINAL text replies. Intermediate tool calls /
 * results live only inside a single agent-loop run, which keeps reloading a
 * conversation trivial (no tool_call/tool pairing to reconstruct) while the
 * assistant still "remembers" earlier choices via its own replies + the summary.
 */

export interface Conversation {
  id: string;
  summary: string | null;
}

export async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
): Promise<Conversation> {
  if (conversationId) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw Errors.notFound('Conversation');
    if (conv.userId !== userId) throw Errors.forbidden('This conversation belongs to someone else');
    return { id: conv.id, summary: conv.summary };
  }
  const conv = await prisma.conversation.create({ data: { userId } });
  return { id: conv.id, summary: null };
}

/** Cross-turn history as chat messages (user/assistant text only). */
export async function loadHistory(conversationId: string): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => {
    const c = r.content as { text?: string } | string;
    const text = typeof c === 'string' ? c : (c.text ?? '');
    return { role: r.role as 'user' | 'assistant', content: text };
  });
}

/** Persist one exchange (user turn + assistant reply). */
export async function appendTurn(
  conversationId: string,
  userText: string,
  assistantText: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, role: 'user', content: { text: userText } } }),
    prisma.message.create({ data: { conversationId, role: 'assistant', content: { text: assistantText } } }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(assistantText ? {} : {}),
      },
    }),
  ]);
}

export async function setSummary(conversationId: string, summary: string): Promise<void> {
  await prisma.conversation.update({ where: { id: conversationId }, data: { summary } });
}

export async function setTitleIfEmpty(conversationId: string, title: string): Promise<void> {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { title: true } });
  if (conv && !conv.title) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { title: title.slice(0, 80) } });
  }
}

// ── API reads ───────────────────────────────────────────────
export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  return rows;
}

export async function getConversationWithMessages(userId: string, conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { where: { role: { in: ['user', 'assistant'] } }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conv) throw Errors.notFound('Conversation');
  if (conv.userId !== userId) throw Errors.forbidden('This conversation belongs to someone else');
  return {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    messages: conv.messages.map((m) => {
      const c = m.content as { text?: string } | string;
      return { role: m.role, text: typeof c === 'string' ? c : (c.text ?? ''), at: m.createdAt };
    }),
  };
}
