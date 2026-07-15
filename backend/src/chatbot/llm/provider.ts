import { env } from '../../config/env.ts';
import { Errors } from '../../lib/errors.ts';
import { withRetry } from '../../lib/retry.ts';
import { childLogger } from '../../lib/logger.ts';
import type { ChatMessage, LLMProvider, ToolSpec } from './types.ts';

const log = childLogger('llm');

/**
 * OpenRouter provider — a thin wrapper over the OpenAI-compatible
 * `/chat/completions` endpoint. OpenRouter is only the transport to the model;
 * the agent loop is entirely our own (no framework). Transient (5xx/network)
 * failures are retried with backoff; 4xx are surfaced as-is.
 */
export class OpenRouterProvider implements LLMProvider {
  constructor(
    private readonly apiKey = env.OPENROUTER_API_KEY,
    private readonly model = env.OPENROUTER_MODEL,
    private readonly baseUrl = env.OPENROUTER_BASE_URL,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_APP_URL,
      'X-Title': env.OPENROUTER_APP_NAME,
    };
  }

  private async request(body: Record<string, unknown>): Promise<any> {
    if (!this.apiKey) throw Errors.internal('OPENROUTER_API_KEY is not configured');

    return withRetry(
      async () => {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
        });
        if (res.ok) return res.json();

        const text = await res.text().catch(() => '');
        if (res.status >= 500 || res.status === 429) {
          throw Errors.upstream(`LLM gateway error ${res.status}`, text); // retryable
        }
        throw Errors.internal(`LLM request failed (${res.status}): ${text.slice(0, 200)}`);
      },
      { retries: 2, label: 'openrouter.chat' },
    );
  }

  async chat(messages: ChatMessage[], tools?: ToolSpec[]): Promise<ChatMessage> {
    const data = await this.request({
      model: this.model,
      messages,
      ...(tools && tools.length ? { tools, tool_choice: 'auto' } : {}),
      temperature: 0.3,
    });
    const msg = data?.choices?.[0]?.message;
    if (!msg) throw Errors.upstream('LLM returned no message');
    return {
      role: 'assistant',
      content: msg.content ?? null,
      ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
    };
  }

  async complete(system: string, user: string): Promise<string> {
    const data = await this.request({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    });
    return data?.choices?.[0]?.message?.content ?? '';
  }
}

// ── Injectable singleton (swap for a scripted fake in tests) ──
let provider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (!provider) provider = new OpenRouterProvider();
  return provider;
}

export function setProvider(p: LLMProvider): void {
  provider = p;
  log.info('LLM provider overridden');
}
