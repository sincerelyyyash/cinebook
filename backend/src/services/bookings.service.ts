import { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import { BOOKING_CODE_PREFIX } from '../config/constants.ts';
import { releaseSeatHold } from '../lib/seat-lock.ts';
import { emitSeatUpdate } from '../realtime/seat-events.ts';
import { cancelHoldExpiry } from './holds.service.ts';
import { priceForCategory, seatLabel } from './availability.service.ts';
import { validatePromo, computeDiscount } from './promos.service.ts';
import { refund as gatewayRefund } from './payment-gateway.ts';
import { audit } from './activity-log.service.ts';
import { bookingsTotal } from '../observability/metrics.ts';
import type { BookingDto, BookingSeatLine } from '../types/booking.types.ts';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomCode(): string {
  let s = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${BOOKING_CODE_PREFIX}-${s}`;
}

const BOOKING_INCLUDE = {
  show: {
    select: {
      id: true,
      startsAt: true,
      format: true,
      basePrice: true,
      movie: { select: { title: true } },
      screen: { select: { name: true, theatre: { select: { name: true, city: true } } } },
    },
  },
  seats: { include: { seat: true } },
  hold: { select: { seatIds: true } },
  payment: { select: { status: true, transactionId: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

async function toDto(b: BookingRow): Promise<BookingDto> {
  let seatLines: BookingSeatLine[];
  if (b.seats.length > 0) {
    // Confirmed: seats are persisted with the price actually paid.
    seatLines = b.seats.map((bs) => ({
      seatId: bs.seatId,
      label: seatLabel(bs.seat.row, bs.seat.number),
      category: bs.seat.category,
      price: bs.pricePaid,
    }));
  } else {
    // Pending: seats still live in the hold; resolve for display.
    const ids = b.hold?.seatIds ?? [];
    const seats = ids.length
      ? await prisma.seat.findMany({ where: { id: { in: ids } } })
      : [];
    seatLines = seats.map((s) => ({
      seatId: s.id,
      label: seatLabel(s.row, s.number),
      category: s.category,
      price: priceForCategory(b.show.basePrice, s.category),
    }));
  }

  return {
    id: b.id,
    code: b.code,
    status: b.status,
    show: {
      id: b.show.id,
      movieTitle: b.show.movie.title,
      screenName: b.show.screen.name,
      theatreName: b.show.screen.theatre.name,
      city: b.show.screen.theatre.city,
      startsAt: b.show.startsAt,
      format: b.show.format,
    },
    seats: seatLines,
    subtotal: b.subtotal,
    discount: b.discount,
    total: b.total,
    promoCode: b.promoCode,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    payment: b.payment ? { status: b.payment.status, transactionId: b.payment.transactionId } : null,
  };
}

async function loadBooking(id: string): Promise<BookingRow> {
  const b = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  if (!b) throw Errors.notFound('Booking');
  return b;
}

function assertOwner(b: { userId: string }, userId: string) {
  if (b.userId !== userId) throw Errors.forbidden('This booking belongs to someone else');
}

/**
 * Create a PENDING booking from an active hold (§1.2 step 4 precursor).
 * Seats stay protected by the live hold; BookedSeat rows are written only at
 * confirmation. The hold's expiry job will expire this booking if unpaid.
 */
export async function createBooking(
  userId: string,
  holdId: string,
  promoCode?: string,
): Promise<BookingDto> {
  const hold = await prisma.seatHold.findUnique({
    where: { id: holdId },
    include: { booking: { select: { id: true } } },
  });
  if (!hold) throw Errors.notFound('Hold');
  assertOwner(hold, userId);
  if (hold.status !== 'ACTIVE') throw Errors.holdExpired();
  if (hold.expiresAt.getTime() <= Date.now()) throw Errors.holdExpired();
  if (hold.booking) throw Errors.conflict('A booking already exists for this hold');

  const show = await prisma.show.findUnique({
    where: { id: hold.showId },
    select: { basePrice: true },
  });
  if (!show) throw Errors.notFound('Show');

  const seats = await prisma.seat.findMany({ where: { id: { in: hold.seatIds } } });
  const subtotal = seats.reduce((sum, s) => sum + priceForCategory(show.basePrice, s.category), 0);

  // Apply a promo up-front if one was supplied (robust to however the flow
  // sequences it; the standalone apply_promo path also exists).
  let discount = 0;
  let appliedCode: string | null = null;
  if (promoCode) {
    const promo = await validatePromo(promoCode, subtotal);
    discount = computeDiscount(promo, subtotal);
    appliedCode = promo.code;
  }
  const total = subtotal - discount;

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        code: randomCode(),
        userId,
        showId: hold.showId,
        status: 'PENDING',
        subtotal,
        discount,
        total,
        promoCode: appliedCode,
        holdId,
        expiresAt: hold.expiresAt,
      },
      select: { id: true },
    });
    await tx.seatHold.update({ where: { id: holdId }, data: { status: 'CONVERTED' } });
    return created;
  });

  await audit({ action: 'booking.create', target: booking.id, actorId: userId, metadata: { showId: hold.showId, total }, success: true });
  bookingsTotal.inc({ event: 'created' });
  return toDto(await loadBooking(booking.id));
}

/**
 * Confirm a PENDING booking: persist BookedSeat rows (the unique constraint is
 * the final double-booking guard), flip to CONFIRMED, and drop the Redis holds
 * since the seats are now permanently booked. In Phase 5 this runs only after
 * a successful payment.
 */
export async function confirmBooking(userId: string, bookingId: string): Promise<BookingDto> {
  const b = await loadBooking(bookingId);
  assertOwner(b, userId);
  if (b.status === 'CONFIRMED') return toDto(b);
  if (b.status !== 'PENDING') throw Errors.conflict(`Booking is ${b.status.toLowerCase()} and cannot be confirmed`);
  if (b.expiresAt && b.expiresAt.getTime() <= Date.now()) throw Errors.holdExpired();
  // Payment gate: a booking can only be confirmed once its payment has succeeded.
  if (!b.payment || b.payment.status !== 'SUCCEEDED') {
    throw Errors.paymentFailed('Complete payment before confirming this booking');
  }

  const seatIds = b.hold?.seatIds ?? [];
  const seats = await prisma.seat.findMany({ where: { id: { in: seatIds } } });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bookedSeat.createMany({
        data: seats.map((s) => ({
          bookingId: b.id,
          seatId: s.id,
          showId: b.showId,
          pricePaid: priceForCategory(b.show.basePrice, s.category),
        })),
      });
      await tx.booking.update({ where: { id: b.id }, data: { status: 'CONFIRMED' } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw Errors.seatUnavailable('One or more seats were booked by someone else while you paid');
    }
    throw err;
  }

  // Seats permanently booked → free the ephemeral hold + its expiry job.
  if (b.holdId) {
    await releaseSeatHold(b.showId, seatIds, b.holdId);
    await prisma.seatHold.update({ where: { id: b.holdId }, data: { status: 'CONVERTED' } });
    await cancelHoldExpiry(b.holdId);
  }
  emitSeatUpdate(b.showId);
  await audit({ action: 'booking.confirm', target: b.id, actorId: userId, metadata: { showId: b.showId }, success: true });
  bookingsTotal.inc({ event: 'confirmed' });
  return toDto(await loadBooking(b.id));
}

/**
 * Cancel a booking and free its seats. If the booking was already paid, this
 * refunds the money too (delegates to refundBooking) — so cancelling a
 * confirmed booking never leaves the customer charged.
 */
export async function cancelBooking(userId: string, bookingId: string): Promise<BookingDto> {
  const b = await loadBooking(bookingId);
  assertOwner(b, userId);
  if (!['PENDING', 'CONFIRMED'].includes(b.status)) {
    throw Errors.conflict(`Booking is already ${b.status.toLowerCase()}`);
  }

  // Paid booking → cancel == refund (money back + seats freed).
  if (b.payment && b.payment.status === 'SUCCEEDED') {
    return refundBooking(userId, bookingId);
  }

  const seatIds = b.hold?.seatIds ?? b.seats.map((s) => s.seatId);

  await prisma.$transaction(async (tx) => {
    if (b.seats.length > 0) {
      await tx.bookedSeat.deleteMany({ where: { bookingId: b.id } });
    }
    await tx.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } });
    if (b.holdId) {
      await tx.seatHold.update({ where: { id: b.holdId }, data: { status: 'RELEASED' } });
    }
  });

  if (b.holdId) {
    await releaseSeatHold(b.showId, seatIds, b.holdId);
    await cancelHoldExpiry(b.holdId);
  }
  emitSeatUpdate(b.showId);
  await audit({ action: 'booking.cancel', target: b.id, actorId: userId, metadata: { showId: b.showId }, success: true });
  bookingsTotal.inc({ event: 'cancelled' });
  return toDto(await loadBooking(b.id));
}

/**
 * Refund a paid, confirmed booking (§1.2 "Supports refunds"): call the gateway,
 * mark the payment REFUNDED, set the booking REFUNDED, and free the seats. This
 * is the single refund implementation — the /payments/:id/refund endpoint and
 * cancel-of-a-paid-booking both route through here.
 */
export async function refundBooking(userId: string, bookingId: string): Promise<BookingDto> {
  const b = await loadBooking(bookingId);
  assertOwner(b, userId);
  if (b.status !== 'CONFIRMED' || !b.payment || b.payment.status !== 'SUCCEEDED') {
    throw Errors.conflict('Only a paid, confirmed booking can be refunded');
  }

  await gatewayRefund(b.payment.transactionId, b.total);

  const seatIds = b.hold?.seatIds ?? b.seats.map((s) => s.seatId);
  await prisma.$transaction(async (tx) => {
    await tx.bookedSeat.deleteMany({ where: { bookingId: b.id } });
    await tx.payment.update({ where: { bookingId: b.id }, data: { status: 'REFUNDED', refundedAt: new Date() } });
    await tx.booking.update({ where: { id: b.id }, data: { status: 'REFUNDED' } });
  });

  if (b.holdId) await releaseSeatHold(b.showId, seatIds, b.holdId);
  emitSeatUpdate(b.showId);
  bookingsTotal.inc({ event: 'refunded' });
  await audit({ action: 'booking.refund', target: b.id, actorId: userId, metadata: { showId: b.showId, amount: b.total }, success: true });
  return toDto(await loadBooking(b.id));
}

export async function getBooking(userId: string, bookingId: string): Promise<BookingDto> {
  const b = await loadBooking(bookingId);
  assertOwner(b, userId);
  return toDto(b);
}

export async function getBookingStatus(userId: string, bookingId: string) {
  const b = await loadBooking(bookingId);
  assertOwner(b, userId);
  return { id: b.id, code: b.code, status: b.status, expiresAt: b.expiresAt };
}

export async function getBookingByCode(userId: string, code: string): Promise<BookingDto> {
  const b = await prisma.booking.findUnique({ where: { code }, include: BOOKING_INCLUDE });
  if (!b) throw Errors.notFound('Booking');
  assertOwner(b, userId);
  return toDto(b);
}

export async function listMyBookings(userId: string, params: PaginationParams) {
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...toPrismaSkipTake(params),
    }),
    prisma.booking.count({ where }),
  ]);
  const data = await Promise.all(rows.map(toDto));
  return paginate(data, total, params);
}
