import { getProfile } from '../services/users.service.ts';
import { runOrchestrator } from './agent/orchestrator.ts';
import { orchestratorPrompt } from './agent/prompts.ts';
import {
  getOrCreateConversation,
  loadHistory,
  appendTurn,
  setSummary,
  setTitleIfEmpty,
} from './context/conversation.store.ts';
import { compactIfNeeded } from './context/compaction.ts';
import { chatbotConversationMessages, chatbotTurnToolCalls } from '../observability/metrics.ts';
import type { AgentEvent } from './agent/loop.ts';
import type { ChatMessage } from './llm/types.ts';

export interface ChatResult {
  conversationId: string;
  reply: string;
}

/**
 * One chat turn: load the user + conversation, compact the history if it's
 * getting long, build the window, run the orchestrator (which may delegate to
 * the booking sub-agent), then persist the exchange.
 */
export async function handleChat(
  userId: string,
  conversationId: string | undefined,
  message: string,
  onEvent?: (e: AgentEvent) => void,
): Promise<ChatResult> {
  const [profile, conv] = await Promise.all([
    getProfile(userId),
    getOrCreateConversation(userId, conversationId),
  ]);

  const rawHistory = await loadHistory(conv.id);
  const { history, summary, compacted } = await compactIfNeeded(rawHistory, conv.summary);
  if (compacted && summary) await setSummary(conv.id, summary);

  const today = new Date().toISOString().slice(0, 10);
  let system = orchestratorPrompt(profile, today);
  if (summary) system += `\n\nEarlier in this conversation: ${summary}`;

  const window: ChatMessage[] = [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: message },
  ];

  const ctx = { userId, conversationId: conv.id };
  const result = await runOrchestrator(window, ctx, today, onEvent);

  await appendTurn(conv.id, message, result.reply);
  await setTitleIfEmpty(conv.id, message);

  // §3.1 metrics: conversation length + tool calls this turn.
  chatbotConversationMessages.observe(rawHistory.length + 2);
  chatbotTurnToolCalls.observe(result.newMessages.filter((m) => m.role === 'tool').length);

  return { conversationId: conv.id, reply: result.reply };
}
