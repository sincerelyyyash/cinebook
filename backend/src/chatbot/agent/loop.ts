import { CHAT_MAX_TOOL_ITERATIONS } from '../../config/constants.ts';
import { childLogger } from '../../lib/logger.ts';
import { getProvider } from '../llm/provider.ts';
import type { ChatMessage } from '../llm/types.ts';
import type { ToolContext, ToolRegistry } from '../tools/registry.ts';

const log = childLogger('agent.loop');

export interface AgentEvent {
  type: 'tool_start' | 'tool_end';
  tool: string;
  ok?: boolean;
}

export interface AgentResult {
  reply: string;
  /** the new messages produced this run (assistant + tool msgs), to persist */
  newMessages: ChatMessage[];
}

/**
 * THE agent loop — one function, used by both the orchestrator and the booking
 * sub-agent. Call the model; if it asks for tools, run them, feed results back,
 * repeat; otherwise return its text. Bounded by CHAT_MAX_TOOL_ITERATIONS.
 *
 * `messages` is the full window (system + history + latest user turn). We push
 * assistant/tool messages onto a fresh `produced` array so callers can persist
 * exactly what happened.
 */
export async function runAgentLoop(
  messages: ChatMessage[],
  registry: ToolRegistry,
  ctx: ToolContext,
  onEvent?: (e: AgentEvent) => void,
): Promise<AgentResult> {
  const provider = getProvider();
  const specs = registry.specs();
  const working = [...messages];
  const produced: ChatMessage[] = [];

  for (let i = 0; i < CHAT_MAX_TOOL_ITERATIONS; i++) {
    const assistant = await provider.chat(working, specs);
    working.push(assistant);
    produced.push(assistant);

    const calls = assistant.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: assistant.content ?? '', newMessages: produced };
    }

    // Run the requested tools (sequentially — keeps ordering + logs simple).
    for (const call of calls) {
      onEvent?.({ type: 'tool_start', tool: call.function.name });
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const result = await registry.execute(call.function.name, args, ctx);
      const ok = !(result && typeof result === 'object' && 'error' in (result as object));
      onEvent?.({ type: 'tool_end', tool: call.function.name, ok });

      const toolMsg: ChatMessage = {
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      };
      working.push(toolMsg);
      produced.push(toolMsg);
    }
  }

  log.warn({ userId: ctx.userId }, 'agent loop hit iteration cap');
  return {
    reply:
      "I've done quite a lot of steps here — could you confirm what you'd like me to do next so I don't go in circles?",
    newMessages: produced,
  };
}
