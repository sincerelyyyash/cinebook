import { describe, it, expect } from 'bun:test';
import { CircuitBreaker } from '../../src/lib/circuit-breaker.ts';
import { withRetry } from '../../src/lib/retry.ts';
import { Errors } from '../../src/lib/errors.ts';

describe('CircuitBreaker', () => {
  const boom = () => Promise.reject(new Error('boom'));
  const onOpen = () => new Error('circuit-open');

  it('opens after the failure threshold and fast-fails without calling fn', async () => {
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 3, cooldownMs: 1000 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(boom, onOpen)).rejects.toThrow('boom');
    }
    expect(cb.getState()).toBe('OPEN');

    let called = false;
    const fn = () => {
      called = true;
      return Promise.resolve('x');
    };
    await expect(cb.execute(fn, onOpen)).rejects.toThrow('circuit-open');
    expect(called).toBe(false); // fast-failed, fn never ran
  });

  it('half-opens after cooldown and closes on a success', async () => {
    let now = 0;
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 1, cooldownMs: 100, now: () => now });
    await expect(cb.execute(boom, onOpen)).rejects.toThrow('boom');
    expect(cb.getState()).toBe('OPEN');

    now = 250; // past cooldown
    const r = await cb.execute(() => Promise.resolve('ok'), onOpen);
    expect(r).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('does not trip when the error is not counted as a failure (e.g. a card decline)', async () => {
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 1, cooldownMs: 100, isFailure: () => false });
    await expect(cb.execute(() => Promise.reject(new Error('declined')), onOpen)).rejects.toThrow('declined');
    expect(cb.getState()).toBe('CLOSED');
  });
});

describe('withRetry', () => {
  it('retries transient errors and eventually succeeds', async () => {
    let n = 0;
    const r = await withRetry(
      async () => {
        if (++n < 3) throw Errors.upstream('transient');
        return 'ok';
      },
      { retries: 3, baseDelayMs: 1, maxDelayMs: 2 },
    );
    expect(r).toBe('ok');
    expect(n).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let n = 0;
    await expect(
      withRetry(
        async () => {
          n++;
          throw Errors.validation('bad input'); // retryable=false
        },
        { retries: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('bad input');
    expect(n).toBe(1);
  });

  it('throws after exhausting retries', async () => {
    let n = 0;
    await expect(
      withRetry(
        async () => {
          n++;
          throw Errors.upstream('always');
        },
        { retries: 2, baseDelayMs: 1, maxDelayMs: 2 },
      ),
    ).rejects.toThrow('always');
    expect(n).toBe(3); // initial + 2 retries
  });
});
