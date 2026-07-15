import { nanoid } from 'nanoid';
import { Errors } from '../lib/errors.ts';
import { childLogger } from '../lib/logger.ts';

const log = childLogger('payment-gateway');

/**
 * SIMULATED payment gateway (assignment §1.2). No real money moves.
 *
 * Behaviour is driven by the test card number so error handling can be
 * exercised deterministically:
 *   - 4111 1111 1111 1111 → always succeeds
 *   - 4000 0000 0000 0002 → always declined (business failure — not retried)
 *   - 4000 0000 0000 9995 → always insufficient funds (business failure)
 *   - 4000 0000 0000 0119 → randomly throws a transient gateway error (~50%)
 *   - 4000 0000 0000 0000 → always throws a transient gateway error
 *   - anything else        → succeeds
 *
 * "Declines" are returned as a failed *result*; "gateway errors" are *thrown*
 * (transient) so the retry + circuit-breaker layers can react to them without
 * a mere card decline tripping the breaker.
 */
export const TEST_CARDS = {
  SUCCESS: '4111111111111111',
  DECLINE: '4000000000000002',
  INSUFFICIENT: '4000000000009995',
  RANDOM: '4000000000000119',
  GATEWAY_ERROR: '4000000000000000',
} as const;

export interface ChargeResult {
  ok: boolean;
  reason?: string; // populated when ok === false
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalize to digits only. */
function normalize(card: string): string {
  return card.replace(/\D/g, '');
}

function realisticLatency(): number {
  return 1000 + Math.floor(Math.random() * 2000); // 1–3s
}

export function newTransactionId(): string {
  return `txn_${nanoid(20)}`;
}

/**
 * Attempt to charge a card. Resolves with { ok } for success/decline; throws a
 * retryable UPSTREAM_ERROR for simulated transport failures.
 */
export async function charge(cardNumber: string, amount: number): Promise<ChargeResult> {
  const card = normalize(cardNumber);
  await sleep(realisticLatency());

  switch (card) {
    case TEST_CARDS.DECLINE:
      return { ok: false, reason: 'Card was declined' };
    case TEST_CARDS.INSUFFICIENT:
      return { ok: false, reason: 'Insufficient funds' };
    case TEST_CARDS.GATEWAY_ERROR:
      log.warn({ amount }, 'gateway error (simulated)');
      throw Errors.upstream('Payment gateway is unreachable');
    case TEST_CARDS.RANDOM:
      if (Math.random() < 0.5) {
        log.warn({ amount }, 'transient gateway error (simulated random)');
        throw Errors.upstream('Payment gateway timed out');
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

/** Refund a previously successful charge (always succeeds in simulation). */
export async function refund(transactionId: string, amount: number): Promise<{ ok: true }> {
  await sleep(realisticLatency());
  log.info({ transactionId, amount }, 'refund processed (simulated)');
  return { ok: true };
}

export function cardLast4(cardNumber: string): string {
  return normalize(cardNumber).slice(-4);
}
