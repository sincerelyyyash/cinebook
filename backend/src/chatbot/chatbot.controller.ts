import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../lib/http.ts';
import { handleChat } from './chatbot.service.ts';
import {
  listConversations,
  getConversationWithMessages,
} from './context/conversation.store.ts';
import type { ChatInput } from '../validators/chatbot.validator.ts';
import type { AgentEvent } from './agent/loop.ts';
import { childLogger } from '../lib/logger.ts';

const log = childLogger('chatbot.controller');

/**
 * POST /chat — Server-Sent Events by default. Emits tool-activity events while
 * the agent works, then streams the final reply. `stream:false` returns plain
 * JSON (handy for scripts/tests).
 */
export const chatController = asyncHandler(async (req: Request, res: Response) => {
  const { message, conversationId, stream } = req.body as ChatInput;
  const userId = req.user!.id;

  if (!stream) {
    const result = await handleChat(userId, conversationId, message);
    return void ok(res, result);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const onEvent = (e: AgentEvent) => send(e);

  try {
    const result = await handleChat(userId, conversationId, message, onEvent);
    // Stream the reply in small chunks for a live feel.
    send({ type: 'conversation', conversationId: result.conversationId });
    for (const chunk of chunkText(result.reply, 24)) send({ type: 'token', text: chunk });
    send({ type: 'done', conversationId: result.conversationId });
  } catch (err) {
    log.error({ err: (err as Error).message }, 'chat failed');
    send({ type: 'error', message: 'Sorry — something went wrong. Please try again.' });
  } finally {
    res.end();
  }
});

function* chunkText(text: string, size: number): Generator<string> {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

export const listConversationsController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listConversations(req.user!.id));
});

export const getConversationController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getConversationWithMessages(req.user!.id, req.params.id!));
});
