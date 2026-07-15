import { nanoid } from 'nanoid';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { acquireSeatHold, releaseSeatHold } from '../lib/seat-lock.ts';
import { SEAT_HOLD_TTL_MS, SEAT_HOLD_TTL_SECONDS, MAX_SEATS_PER_HOLD } from '../config/constants.ts';
import { seatHoldQueue } from '../infra/queues/index.ts';
import { emitSeatUpdate } from '../realtime/seat-events.ts';
import { resolveSeatsForShow, seatLabel, priceForCategory } from './availability.service.ts';
import { audit } from './activity-log.service.ts';
import type { HoldDto, HoldSeatLine } from '../types/booking.types.ts';

const EXPIRY_JOB = 'expire-hold';

function buildLines(
  basePrice: number,
  seats: Array<{ id: string; row: string; number: number; category: HoldSeatLine['category'] }>,
): HoldSeatLine[] {
  return seats.map((s) => ({
    seatId: s.id,
    label: seatLabel(s.row, s.number),
    category: s.category,
    price: priceForCategory(basePrice, s.category),
  }));
}

/**
 * Place a 5-minute hold on a set of seats (assignment §1.2).
 * Atomic all-or-nothing via the Redis Lua lock; a durable SeatHold row mirrors
 * it; a delayed BullMQ job auto-releases it if the hold isn't converted.
 */
export async function createHold(
  userId: string,
  showId: string,
  seatIds: string[],
): Promise<HoldDto> {
  const unique = [...new Set(seatIds)];
  if (unique.length === 0) throw Errors.validation('Select at least one seat');
  if (unique.length > MAX_SEATS_PER_HOLD) {
    throw Errors.validation(`You can hold at most ${MAX_SEATS_PER_HOLD} seats at once`);
  }

  const { show, seats } = await resolveSeatsForShow(showId, unique);
  if (show.status !== 'SCHEDULED' || show.startsAt.getTime() <= Date.now()) {
    throw Errors.conflict('This show is not open for booking');
  }

  // Reject seats already permanently booked (confirmed).
  const booked = await prisma.bookedSeat.findMany({
    where: { showId, seatId: { in: unique } },
    select: { seatId: true },
  });
  if (booked.length > 0) {
    throw Errors.seatUnavailable('Some of those seats are already booked', {
      seatIds: booked.map((b) => b.seatId),
    });
  }

  const holdId = `h_${nanoid()}`;
  const expiresAt = new Date(Date.now() + SEAT_HOLD_TTL_MS);

  // Acquire the live lock first; only persist if we actually got the seats.
  const lock = await acquireSeatHold(showId, unique, holdId);
  if (!lock.ok) {
    throw Errors.seatUnavailable('One or more seats were just taken by someone else', {
      seatId: lock.conflictSeatId,
    });
  }

  try {
    await prisma.seatHold.create({
      data: { id: holdId, showId, seatIds: unique, userId, status: 'ACTIVE', expiresAt },
    });
    await seatHoldQueue.add(
      EXPIRY_JOB,
      { holdId, showId, seatIds: unique, userId },
      { delay: SEAT_HOLD_TTL_MS, jobId: holdId },
    );
  } catch (err) {
    // Roll the lock back if persistence failed.
    await releaseSeatHold(showId, unique, holdId);
    throw err;
  }

  emitSeatUpdate(showId);
  await audit({ action: 'seat.hold', target: holdId, actorId: userId, metadata: { showId, seats: unique.length }, success: true });

  return {
    id: holdId,
    showId,
    seats: buildLines(show.basePrice, seats),
    subtotal: buildLines(show.basePrice, seats).reduce((sum, l) => sum + l.price, 0),
    expiresAt,
    ttlSeconds: SEAT_HOLD_TTL_SECONDS,
  };
}

/** Cancel a hold the user owns (frees the seats immediately). Idempotent. */
export async function releaseHold(userId: string, holdId: string): Promise<{ released: boolean }> {
  const hold = await prisma.seatHold.findUnique({ where: { id: holdId } });
  if (!hold) throw Errors.notFound('Hold');
  if (hold.userId !== userId) throw Errors.forbidden('This hold belongs to someone else');

  if (hold.status !== 'ACTIVE') return { released: false }; // already released/converted/expired

  await releaseSeatHold(hold.showId, hold.seatIds, holdId);
  await prisma.seatHold.update({ where: { id: holdId }, data: { status: 'RELEASED' } });
  await seatHoldQueue.remove(holdId).catch(() => undefined);

  emitSeatUpdate(hold.showId);
  await audit({ action: 'seat.release', target: holdId, actorId: userId, metadata: { showId: hold.showId }, success: true });
  return { released: true };
}

/** Remove the pending expiry job once a hold is converted to a booking. */
export async function cancelHoldExpiry(holdId: string): Promise<void> {
  await seatHoldQueue.remove(holdId).catch(() => undefined);
}

/**
 * Worker entrypoint: fired when a hold's 5 minutes elapse.
 * Releases an un-converted hold, or expires a still-unpaid booking made from it.
 */
export async function expireHold(holdId: string): Promise<void> {
  const hold = await prisma.seatHold.findUnique({
    where: { id: holdId },
    include: { booking: true },
  });
  if (!hold) return;

  if (hold.status === 'ACTIVE') {
    await releaseSeatHold(hold.showId, hold.seatIds, holdId);
    await prisma.seatHold.update({ where: { id: holdId }, data: { status: 'EXPIRED' } });
    emitSeatUpdate(hold.showId);
    await audit({ action: 'seat.hold.expired', target: holdId, metadata: { showId: hold.showId }, success: true });
    return;
  }

  // Converted to a booking that never got paid → expire it and free the seats.
  if (hold.status === 'CONVERTED' && hold.booking && hold.booking.status === 'PENDING') {
    await prisma.booking.update({ where: { id: hold.booking.id }, data: { status: 'EXPIRED' } });
    await releaseSeatHold(hold.showId, hold.seatIds, holdId);
    await prisma.seatHold.update({ where: { id: holdId }, data: { status: 'EXPIRED' } });
    emitSeatUpdate(hold.showId);
    await audit({ action: 'booking.expired', target: hold.booking.id, metadata: { showId: hold.showId }, success: true });
  }
}
