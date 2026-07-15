import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped context propagated implicitly through the async call chain.
 * Lets the logger, activity-log, and tracing helpers correlate everything
 * that happens while handling a single request/chat turn — without threading
 * a context object through every function signature.
 */
export interface RequestContext {
  traceId: string;
  userId?: string;
  userRole?: string;
  /** high-resolution start time (ms) for latency measurement */
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}

/** Patch the current context in place (e.g. once the user is authenticated). */
export function setContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, patch);
}
