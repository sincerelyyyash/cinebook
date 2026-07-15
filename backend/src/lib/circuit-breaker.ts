import { childLogger } from './logger.ts';

const log = childLogger('circuit-breaker');

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number; // consecutive failures before opening
  cooldownMs: number; // how long to stay OPEN before probing
  halfOpenMaxCalls?: number; // probe calls allowed in HALF_OPEN
  /** which errors count toward tripping the breaker (default: all) */
  isFailure?: (err: unknown) => boolean;
  now?: () => number; // injectable clock for tests
}

/**
 * Minimal, dependency-free circuit breaker.
 *
 * Wraps a flaky dependency (the simulated payment gateway). After
 * `failureThreshold` consecutive failures it OPENs and fails fast with the
 * provided fallback error for `cooldownMs`; then it HALF_OPENs and lets a
 * limited number of probe calls through. A success closes it again.
 */
export class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;

  private readonly opts: Required<Omit<CircuitBreakerOptions, 'isFailure'>> &
    Pick<CircuitBreakerOptions, 'isFailure'>;

  constructor(options: CircuitBreakerOptions) {
    this.opts = {
      halfOpenMaxCalls: 1,
      now: () => Date.now(),
      ...options,
    };
  }

  getState(): BreakerState {
    return this.state;
  }

  /**
   * Run `fn` through the breaker. If the breaker is OPEN, `onOpen` is invoked
   * to produce the fast-fail error (e.g. Errors.paymentUnavailable()).
   */
  async execute<T>(fn: () => Promise<T>, onOpen: () => Error): Promise<T> {
    this.maybeHalfOpen();

    if (this.state === 'OPEN') {
      throw onOpen();
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenInFlight >= this.opts.halfOpenMaxCalls) {
        throw onOpen();
      }
      this.halfOpenInFlight++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      const counts = this.opts.isFailure ? this.opts.isFailure(err) : true;
      if (counts) this.onFailure();
      else this.onSuccess(); // non-failures (e.g. declined card) shouldn't trip the breaker
      throw err;
    } finally {
      if (this.state === 'HALF_OPEN' && this.halfOpenInFlight > 0) this.halfOpenInFlight--;
    }
  }

  private maybeHalfOpen(): void {
    if (this.state === 'OPEN' && this.opts.now() - this.openedAt >= this.opts.cooldownMs) {
      this.state = 'HALF_OPEN';
      this.halfOpenInFlight = 0;
      log.info({ breaker: this.opts.name }, 'circuit half-open (probing)');
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      log.info({ breaker: this.opts.name }, 'circuit closed');
    }
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.opts.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.opts.now();
      log.warn(
        { breaker: this.opts.name, consecutiveFailures: this.consecutiveFailures },
        'circuit opened',
      );
    }
  }
}
