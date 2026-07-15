import { prisma } from '../infra/prisma.ts';
import { Errors, isAppError } from '../lib/errors.ts';
import { withRetry } from '../lib/retry.ts';
import { CircuitBreaker } from '../lib/circuit-breaker.ts';
import { PAYMENT_CIRCUIT_BREAKER, RETRY_DEFAULTS } from '../config/constants.ts';
import { childLogger } from '../lib/logger.ts';
import { paymentsTotal } from '../observability/metrics.ts';
import { charge, newTransactionId, cardLast4 } from './payment-gateway.ts';
import { confirmBooking, getBooking } from './bookings.service.ts';
import { consumePromo } from './promos.service.ts';
import { audit } from './activity-log.service.ts';
import type { BookingDto } from '../types/booking.types.ts';

const log = childLogger('payments');

/**
 * Circuit breaker around the payment gateway (§3.2). Only *thrown* gateway
 * errors count toward tripping it — card declines are returned as results and
 * must not open the breaker. When open, callers get a friendly
 * PAYMENT_UNAVAILABLE instead of hammering a failing gateway.
 */
const breaker = new CircuitBreaker({
  name: 'payment-gateway',
  failureThreshold: PAYMENT_CIRCUIT_BREAKER.failureThreshold,
  cooldownMs: PAYMENT_CIRCUIT_BREAKER.cooldownMs,
  halfOpenMaxCalls: PAYMENT_CIRCUIT_BREAKER.halfOpenMaxCalls,
});

export interface PaymentDto {
  id: string;
  status: string;
  transactionId: string;
  amount: number;
  cardLast4: string | null;
  failureReason: string | null;
}

export interface PaymentResult {
  payment: PaymentDto;
  booking: BookingDto;
}

function toPaymentDto(p: {
  id: string;
  status: string;
  transactionId: string;
  amount: number;
  cardLast4: string | null;
  failureReason: string | null;
}): PaymentDto {
  return {
    id: p.id,
    status: p.status,
    transactionId: p.transactionId,
    amount: p.amount,
    cardLast4: p.cardLast4,
    failureReason: p.failureReason,
  };
}

async function loadPendingBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) throw Errors.notFound('Booking');
  if (booking.userId !== userId) throw Errors.forbidden('This booking belongs to someone else');
  return booking;
}

/** Begin checkout: create (or reuse) the payment intent for a booking. */
export async function startPayment(userId: string, bookingId: string): Promise<PaymentDto> {
  const booking = await loadPendingBooking(userId, bookingId);
  if (booking.status === 'CONFIRMED') throw Errors.conflict('This booking is already paid');
  if (booking.status !== 'PENDING') throw Errors.conflict(`Booking is ${booking.status.toLowerCase()}`);
  if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) throw Errors.holdExpired();

  const payment = await prisma.payment.upsert({
    where: { bookingId },
    update: { amount: booking.total, status: 'INITIATED', failureReason: null },
    create: {
      bookingId,
      amount: booking.total,
      status: 'INITIATED',
      transactionId: newTransactionId(),
    },
  });
  await audit({ action: 'payment.start', target: payment.id, actorId: userId, metadata: { bookingId, amount: booking.total }, success: true });
  return toPaymentDto(payment);
}

/**
 * Complete checkout: charge the card through the breaker + retry layers.
 * On success, mark the payment SUCCEEDED and confirm the booking (which writes
 * the BookedSeat rows). Declines leave the booking PENDING so the user can
 * retry with another card before the hold expires.
 */
export async function confirmPayment(
  userId: string,
  bookingId: string,
  cardNumber: string,
): Promise<PaymentResult> {
  const booking = await loadPendingBooking(userId, bookingId);
  if (booking.status === 'CONFIRMED') {
    return { payment: toPaymentDto(booking.payment!), booking: await getBooking(userId, bookingId) };
  }
  if (booking.status !== 'PENDING') throw Errors.conflict(`Booking is ${booking.status.toLowerCase()}`);
  if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) throw Errors.holdExpired();

  // Ensure a payment intent exists.
  const payment =
    booking.payment ??
    (await prisma.payment.create({
      data: { bookingId, amount: booking.total, status: 'INITIATED', transactionId: newTransactionId() },
    }));

  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PROCESSING' } });

  let result: { ok: boolean; reason?: string };
  try {
    result = await breaker.execute(
      () =>
        withRetry(() => charge(cardNumber, booking.total), {
          retries: RETRY_DEFAULTS.retries,
          isRetryable: (e) => isAppError(e) && e.retryable,
          label: 'gateway.charge',
        }),
      () => Errors.paymentUnavailable(),
    );
  } catch (err) {
    // Transient gateway failure (retries exhausted) or breaker open.
    const reason = isAppError(err) ? err.message : 'Payment could not be processed';
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason } });
    await audit({ action: 'payment.failed', target: payment.id, actorId: userId, metadata: { bookingId, reason }, success: false });
    const unavailable = isAppError(err) && err.code === 'PAYMENT_UNAVAILABLE';
    paymentsTotal.inc({ outcome: unavailable ? 'unavailable' : 'failed' });
    if (unavailable) throw err;
    throw Errors.paymentFailed('Payment could not be processed. Please try again.');
  }

  if (!result.ok) {
    // Business decline — does not trip the breaker; user may retry.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: result.reason, cardLast4: cardLast4(cardNumber) },
    });
    await audit({ action: 'payment.declined', target: payment.id, actorId: userId, metadata: { bookingId, reason: result.reason }, success: false });
    paymentsTotal.inc({ outcome: 'declined' });
    throw Errors.paymentFailed(result.reason ?? 'Payment declined');
  }

  // Success → record it, then finalize the booking.
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'SUCCEEDED', cardLast4: cardLast4(cardNumber), failureReason: null },
  });
  const confirmed = await confirmBooking(userId, bookingId);
  if (booking.promoCode) await consumePromo(booking.promoCode);
  paymentsTotal.inc({ outcome: 'succeeded' });

  await audit({ action: 'payment.succeeded', target: payment.id, actorId: userId, metadata: { bookingId, amount: booking.total }, success: true });
  log.info({ bookingId, amount: booking.total }, 'payment succeeded');

  const fresh = await prisma.payment.findUnique({ where: { id: payment.id } });
  return { payment: toPaymentDto(fresh!), booking: confirmed };
}

export function breakerState(): string {
  return breaker.getState();
}
