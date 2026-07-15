import { describe, it, expect } from 'bun:test';
import { runAgentLoop } from '../../src/chatbot/agent/loop.ts';
import { setProvider } from '../../src/chatbot/llm/provider.ts';
import type { ChatMessage, LLMProvider } from '../../src/chatbot/llm/types.ts';
import type { ToolRegistry } from '../../src/chatbot/tools/registry.ts';

const ctx = { userId: 'u1', conversationId: 'c1' };

/** A stub registry so the loop can be tested without tools/DB. */
function stubRegistry(onExec?: (name: string) => void): ToolRegistry {
  return {
    specs: () => [{ type: 'function', function: { name: 'echo', description: '', parameters: {} } }],
    execute: async (name: string, args: unknown) => {
      onExec?.(name);
      return { echoed: args };
    },
    names: () => ['echo'],
    add: () => ({}) as ToolRegistry,
  } as unknown as ToolRegistry;
}

describe('runAgentLoop', () => {
  it('executes a requested tool, feeds the result back, and returns the final text', async () => {
    let firstCall = true;
    const provider: LLMProvider = {
      complete: async () => '',
      chat: async (): Promise<ChatMessage> => {
        if (firstCall) {
          firstCall = false;
          return {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 't1', type: 'function', function: { name: 'echo', arguments: '{"x":1}' } }],
          };
        }
        return { role: 'assistant', content: 'all done' };
      },
    };
    setProvider(provider);

    const executed: string[] = [];
    const res = await runAgentLoop(
      [{ role: 'system', content: 's' }, { role: 'user', content: 'hi' }],
      stubRegistry((n) => executed.push(n)),
      ctx,
    );

    expect(executed).toEqual(['echo']);
    expect(res.reply).toBe('all done');
    expect(res.newMessages.some((m) => m.role === 'tool')).toBe(true);
  });

  it('emits tool_start/tool_end events', async () => {
    let first = true;
    setProvider({
      complete: async () => '',
      chat: async (): Promise<ChatMessage> => {
        if (first) {
          first = false;
          return { role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'echo', arguments: '{}' } }] };
        }
        return { role: 'assistant', content: 'ok' };
      },
    });

    const events: string[] = [];
    await runAgentLoop([{ role: 'user', content: 'go' }], stubRegistry(), ctx, (e) => events.push(e.type));
    expect(events).toContain('tool_start');
    expect(events).toContain('tool_end');
  });

  it('stops at the iteration cap when the model never finishes', async () => {
    setProvider({
      complete: async () => '',
      chat: async (): Promise<ChatMessage> => ({
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 't', type: 'function', function: { name: 'echo', arguments: '{}' } }],
      }),
    });
    const res = await runAgentLoop([{ role: 'user', content: 'loop' }], stubRegistry(), ctx);
    expect(res.reply).toMatch(/confirm/i); // the safety reply
  });
});
