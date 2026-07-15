import { z } from 'zod';
import { ToolRegistry, type Tool, type ToolContext } from '../tools/registry.ts';
import { allTools } from '../tools/index.ts';
import { runAgentLoop, type AgentEvent, type AgentResult } from './loop.ts';
import { runBookingAgent } from './booking-agent.ts';
import type { ChatMessage } from '../llm/types.ts';

/**
 * The `delegate_booking` tool — the orchestrator's handoff to the sub-agent.
 * It's just another tool; its handler runs the booking sub-agent and returns
 * the summary as this tool's result.
 */
function delegateBookingTool(today: string): Tool {
  return {
    name: 'delegate_booking',
    description:
      'Hand a complex, multi-step booking task to the booking specialist, which finds the show and holds the best seats, then reports back. Use for requests like "book 2 recliner seats for Inception at PVR tomorrow evening". Pass all known details (movie, city/theatre, date/time, number & type of seats) in the task.',
    schema: z.object({ task: z.string().describe('the full booking task, with all known details') }),
    handler: (ctx: ToolContext, i: { task: string }) =>
      runBookingAgent(ctx, i.task, today).then((summary) => ({ summary })),
  };
}

/**
 * Run one orchestrator turn. `messages` is the full window (system + history +
 * new user message). Returns the reply plus the messages to persist.
 */
export async function runOrchestrator(
  messages: ChatMessage[],
  ctx: ToolContext,
  today: string,
  onEvent?: (e: AgentEvent) => void,
): Promise<AgentResult> {
  const registry = new ToolRegistry([...allTools, delegateBookingTool(today)]);
  return runAgentLoop(messages, registry, ctx, onEvent);
}
