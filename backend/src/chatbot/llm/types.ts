/**
 * OpenAI/OpenRouter-compatible chat types. Kept minimal — just what the agent
 * loop needs. A message is stored verbatim (including tool calls/results) so a
 * conversation can be reloaded from the DB exactly as the model saw it.
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string }; // arguments is a JSON string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string; // set on role: 'tool'
  name?: string; // tool name on role: 'tool' (optional, aids debugging)
}

export interface ToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/** The provider abstraction — swap OpenRouter for a scripted fake in tests. */
export interface LLMProvider {
  chat(messages: ChatMessage[], tools?: ToolSpec[]): Promise<ChatMessage>;
  /** Single-shot completion with no tools (used for context compaction). */
  complete(system: string, user: string): Promise<string>;
}
