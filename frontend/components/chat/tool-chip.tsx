/**
 * Shared types for the agent's tool activity. Rendering lives in `tool-trace.tsx`,
 * which collapses the whole run into one self-updating control.
 */
export type ToolStatus = 'running' | 'done' | 'failed'

export interface ToolActivity {
  id: string
  tool: string
  status: ToolStatus
}
