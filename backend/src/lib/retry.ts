import { RETRY_DEFAULTS } from '../config/constants.ts';
import { isAppError } from './errors.ts';
import { childLogger } from './logger.ts';

const log = childLogger('retry');

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  /** decide whether a given error is worth retrying (default: retryable AppErrors + unknown) */
  isRetryable?: (err: unknown) => boolean;
  /** label for logging */
  label?: string;
}

const defaultIsRetryable = (err: unknown): boolean => {
  if (isAppError(err)) return err.retryable;
  // Unknown/thrown errors (network, timeouts) are assumed transient.
  return true;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry an async operation with exponential backoff + full jitter.
 * Used for flaky upstreams (LLM gateway, transient payment glitches).
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? RETRY_DEFAULTS.retries;
  const base = opts.baseDelayMs ?? RETRY_DEFAULTS.baseDelayMs;
  const max = opts.maxDelayMs ?? RETRY_DEFAULTS.maxDelayMs;
  const factor = opts.factor ?? RETRY_DEFAULTS.factor;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;

  let attempt = 0;
  // total tries = retries + 1 (initial)
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isRetryable(err)) throw err;

      const backoff = Math.min(max, base * factor ** (attempt - 1));
      const delay = Math.random() * backoff; // full jitter
      log.warn(
        { label: opts.label, attempt, retries, delayMs: Math.round(delay) },
        'retrying after failure',
      );
      await sleep(delay);
    }
  }
}
