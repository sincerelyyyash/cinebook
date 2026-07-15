import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { childLogger } from '../../lib/logger.ts';
import { audit } from '../../services/activity-log.service.ts';
import { chatbotToolCalls } from '../../observability/metrics.ts';
import { isAppError } from '../../lib/errors.ts';
import type { ToolSpec } from '../llm/types.ts';

const log = childLogger('chatbot.tools');

/** Context every tool handler receives (the authenticated chat user). */
export interface ToolContext {
  userId: string;
  conversationId: string;
}

export interface Tool<I = any> {
  name: string;
  description: string;
  schema: z.ZodType<I>;
  handler: (ctx: ToolContext, input: I) => Promise<unknown>;
}

/** A flat registry: name → tool. Simple on purpose. */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    for (const t of tools) this.add(t);
  }

  add(tool: Tool): this {
    this.tools.set(tool.name, tool as Tool);
    return this;
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  /** OpenAI/OpenRouter tool specs derived from the zod schemas. */
  specs(): ToolSpec[] {
    return [...this.tools.values()].map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.schema, { target: 'openApi3' }) as Record<string, unknown>,
      },
    }));
  }

  /**
   * Validate args, run the handler, and record the call (§3.1: every chatbot
   * action logged with duration + success). Errors are returned as a structured
   * result so the model can recover conversationally rather than the turn dying.
   */
  async execute(name: string, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) return { error: `Unknown tool: ${name}` };

    const start = performance.now();
    const parsed = tool.schema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      return { error: 'Invalid arguments', details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
    }

    try {
      const result = await tool.handler(ctx, parsed.data);
      const durationMs = Math.round(performance.now() - start);
      chatbotToolCalls.inc({ tool: name, success: 'true' });
      await audit({
        action: `chatbot.tool.${name}`,
        actorId: ctx.userId,
        metadata: { conversationId: ctx.conversationId },
        success: true,
        durationMs,
      });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const message = isAppError(err) ? err.message : 'Something went wrong running this action';
      chatbotToolCalls.inc({ tool: name, success: 'false' });
      await audit({
        action: `chatbot.tool.${name}`,
        actorId: ctx.userId,
        metadata: { conversationId: ctx.conversationId, error: message },
        success: false,
        durationMs,
      });
      log.warn({ tool: name, err: message }, 'tool failed');
      // Return the error to the model — it can apologize / try another path.
      return { error: message };
    }
  }
}
