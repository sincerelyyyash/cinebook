import { ToolRegistry, type ToolContext } from '../tools/registry.ts';
import { bookingAgentTools } from '../tools/index.ts';
import { bookingAgentPrompt } from './prompts.ts';
import { runAgentLoop, type AgentEvent } from './loop.ts';
import type { ChatMessage } from '../llm/types.ts';

const registry = new ToolRegistry(bookingAgentTools);

/**
 * The delegated booking sub-agent (§2.1.B). It runs the SAME loop as the
 * orchestrator but with a focused toolset and prompt, and a fresh short
 * message history — so its many internal steps collapse into one clean summary
 * that the orchestrator gets back as a single tool result.
 */
export async function runBookingAgent(
  ctx: ToolContext,
  task: string,
  today: string,
  onEvent?: (e: AgentEvent) => void,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: bookingAgentPrompt(today) },
    { role: 'user', content: task },
  ];
  const result = await runAgentLoop(messages, registry, ctx, onEvent);
  return result.reply;
}
