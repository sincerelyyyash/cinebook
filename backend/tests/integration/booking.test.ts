import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupFixture, teardownFixture, type Fixture } from './fixtures.ts';
import { getShowAvailability } from '../../src/services/availability.service.ts';
import { createHold, releaseHold, expireHold } from '../../src/services/holds.service.ts';
import { createBooking, confirmBooking, cancelBooking, getBooking } from '../../src/services/bookings.service.ts';
import { startPayment, confirmPayment } from '../../src/services/payments.service.ts';
import { TEST_CARDS } from '../../src/services/payment-gateway.ts';
import { isAppError } from '../../src/lib/errors.ts';

let f: Fixture;
beforeAll(async () => {
  f = await setupFixture();
});
afterAll(async () => {
  await teardownFixture(f);
});

describe('booking flow', () => {
  it('shows all seats available initially', async () => {
    const a = await getShowAvailability(f.showId);
    expect(a.summary.total).toBe(f.seatIds.length);
    expect(a.summary.available).toBe(f.seatIds.length);
    expect(a.summary.booked).toBe(0);
  });

  it('holds seats atomically and reflects them as HELD', async () => {
    const seatIds = f.standardSeatIds.slice(0, 2);
    const hold = await createHold(f.customerId, f.showId, seatIds);
    expect(hold.seats).toHaveLength(2);
    expect(hold.subtotal).toBeGreaterThan(0);

    const a = await getShowAvailability(f.showId);
    expect(a.summary.held).toBe(2);

    // a different customer cannot hold an overlapping seat
    await expect(createHold(f.customer2Id, f.showId, [seatIds[0]!])).rejects.toThrow();

    await releaseHold(f.customerId, hold.id);
    const a2 = await getShowAvailability(f.showId);
    expect(a2.summary.held).toBe(0);
  });

  it('completes hold → book → pay(success) → CONFIRMED and marks seats BOOKED', async () => {
    const seatIds = f.standardSeatIds.slice(2, 4);
    const hold = await createHold(f.customerId, f.showId, seatIds);
    const booking = await createBooking(f.customerId, hold.id);
    expect(booking.status).toBe('PENDING');
    expect(booking.code).toMatch(/^CB-/);

    await startPayment(f.customerId, booking.id);
    const result = await confirmPayment(f.customerId, booking.id, TEST_CARDS.SUCCESS);
    expect(result.payment.status).toBe('SUCCEEDED');
    expect(result.booking.status).toBe('CONFIRMED');

    const a = await getShowAvailability(f.showId);
    expect(a.summary.booked).toBe(2);

    // cancel a paid booking → refunded + seats freed
    const cancelled = await cancelBooking(f.customerId, booking.id);
    expect(cancelled.status).toBe('REFUNDED');
    expect(cancelled.payment?.status).toBe('REFUNDED');
    const a2 = await getShowAvailability(f.showId);
    expect(a2.summary.booked).toBe(0);
  }, 20000);

  it('leaves the booking PENDING when the card is declined', async () => {
    const hold = await createHold(f.customerId, f.showId, f.standardSeatIds.slice(0, 1));
    const booking = await createBooking(f.customerId, hold.id);
    await startPayment(f.customerId, booking.id);
    await expect(confirmPayment(f.customerId, booking.id, TEST_CARDS.DECLINE)).rejects.toThrow();

    const status = await getBooking(f.customerId, booking.id);
    expect(status.status).toBe('PENDING');
    await releaseHold(f.customerId, hold.id).catch(() => {});
    await cancelBooking(f.customerId, booking.id).catch(() => {});
  }, 20000);

  it('auto-releases an expired hold', async () => {
    const hold = await createHold(f.customerId, f.showId, f.standardSeatIds.slice(4, 6));
    let a = await getShowAvailability(f.showId);
    expect(a.summary.held).toBeGreaterThanOrEqual(2);

    await expireHold(hold.id); // simulate the BullMQ job firing
    a = await getShowAvailability(f.showId);
    expect(a.summary.held).toBe(0);
  });

  it('rejects booking from an expired/unknown hold', async () => {
    try {
      await createBooking(f.customerId, 'h_does_not_exist');
      throw new Error('should have thrown');
    } catch (e) {
      expect(isAppError(e)).toBe(true);
    }
  });
});
