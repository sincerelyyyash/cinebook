import { CHAT_CONTEXT_TOKEN_BUDGET, CHAT_RECENT_TURNS_KEPT } from '../../config/constants.ts';
import { getProvider } from '../llm/provider.ts';
import type { ChatMessage } from '../llm/types.ts';

/** Rough token estimate (~4 chars/token) — good enough to decide when to compact. */
export function estimateTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  return Math.ceil(chars / 4);
}

const SUMMARY_SYSTEM =
  'You compress a movie-booking chat into a short running summary. Keep concrete facts the assistant must not forget: the customer’s intent, chosen movie/show/theatre, seats or hold ids, booking ids, preferences, and what step they are on. 120 words max. Output only the summary.';

/**
 * If the history is getting long, fold everything except the last N messages
 * into `conversation.summary`, keeping the recent turns verbatim. Returns the
 * (possibly trimmed) history to send and the updated summary, or nulls if no
 * compaction was needed.
 */
export async function compactIfNeeded(
  history: ChatMessage[],
  currentSummary: string | null,
): Promise<{ history: ChatMessage[]; summary: string | null; compacted: boolean }> {
  if (history.length <= CHAT_RECENT_TURNS_KEPT || estimateTokens(history) < CHAT_CONTEXT_TOKEN_BUDGET) {
    return { history, summary: currentSummary, compacted: false };
  }

  const older = history.slice(0, history.length - CHAT_RECENT_TURNS_KEPT);
  const recent = history.slice(history.length - CHAT_RECENT_TURNS_KEPT);

  const transcript = older.map((m) => `${m.role}: ${m.content ?? ''}`).join('\n');
  const prompt = `Previous summary:\n${currentSummary ?? '(none)'}\n\nNew messages to fold in:\n${transcript}`;
  const summary = await getProvider().complete(SUMMARY_SYSTEM, prompt);

  return { history: recent, summary: summary.trim() || currentSummary, compacted: true };
}
