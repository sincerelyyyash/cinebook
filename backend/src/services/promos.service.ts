import type { Promo } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { getBooking } from './bookings.service.ts';
import { audit } from './activity-log.service.ts';
import type { BookingDto } from '../types/booking.types.ts';

export interface PromoPreview {
  code: string;
  description: string;
  discount: number; // paise
}

/** Discount (paise) for an order of `amount`, never exceeding the amount. */
export function computeDiscount(promo: Promo, amount: number): number {
  let discount = 0;
  if (promo.percentOff != null) {
    discount = Math.floor((amount * promo.percentOff) / 100);
    if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
  } else if (promo.flatOff != null) {
    discount = promo.flatOff;
  }
  return Math.min(discount, amount);
}

/** Validate a promo against an order amount, throwing a clear reason if invalid. */
export async function validatePromo(code: string, amount: number): Promise<Promo> {
  const promo = await prisma.promo.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo || !promo.isActive) throw Errors.promoInvalid('That promo code is not valid');

  const now = Date.now();
  if (now < promo.validFrom.getTime()) throw Errors.promoInvalid('This promo is not active yet');
  if (now > promo.validTo.getTime()) throw Errors.promoInvalid('This promo has expired');
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw Errors.promoInvalid('This promo has reached its usage limit');
  }
  if (promo.minAmount != null && amount < promo.minAmount) {
    throw Errors.promoInvalid(
      `Add ₹${((promo.minAmount - amount) / 100).toFixed(0)} more to use this promo`,
      { minAmount: promo.minAmount },
    );
  }
  return promo;
}

/** Preview a code against an amount (chatbot "apply promo" / checkout hint). */
export async function previewPromo(code: string, amount: number): Promise<PromoPreview> {
  const promo = await validatePromo(code, amount);
  return { code: promo.code, description: promo.description, discount: computeDiscount(promo, amount) };
}

/** Apply a promo to a PENDING booking, recomputing its discount + total. */
export async function applyPromoToBooking(
  userId: string,
  bookingId: string,
  code: string,
): Promise<BookingDto> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw Errors.notFound('Booking');
  if (booking.userId !== userId) throw Errors.forbidden('This booking belongs to someone else');
  if (booking.status !== 'PENDING') {
    throw Errors.conflict('Promos can only be applied before payment');
  }

  const promo = await validatePromo(code, booking.subtotal);
  const discount = computeDiscount(promo, booking.subtotal);

  await prisma.booking.update({
    where: { id: bookingId },
    data: { promoCode: promo.code, discount, total: booking.subtotal - discount },
  });
  await audit({ action: 'promo.apply', target: bookingId, actorId: userId, metadata: { code: promo.code, discount }, success: true });
  return getBooking(userId, bookingId);
}

/** Increment usage once a promo-bearing booking is actually paid. */
export async function consumePromo(code: string): Promise<void> {
  await prisma.promo.update({ where: { code }, data: { usedCount: { increment: 1 } } }).catch(() => undefined);
}

/** Currently-valid promos (for the chatbot's "look for offers" and checkout). */
export async function listActivePromos() {
  const now = new Date();
  const promos = await prisma.promo.findMany({
    where: { isActive: true, validFrom: { lte: now }, validTo: { gte: now } },
    orderBy: { validTo: 'asc' },
  });
  return promos.map((p) => ({
    code: p.code,
    description: p.description,
    percentOff: p.percentOff,
    flatOff: p.flatOff,
    minAmount: p.minAmount,
    maxDiscount: p.maxDiscount,
    validTo: p.validTo,
  }));
}

export interface CreatePromoInput {
  code: string;
  description: string;
  percentOff?: number;
  flatOff?: number;
  maxDiscount?: number;
  minAmount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
}

export async function createPromo(input: CreatePromoInput) {
  if (input.percentOff == null && input.flatOff == null) {
    throw Errors.validation('Provide either percentOff or flatOff');
  }
  const promo = await prisma.promo.create({
    data: { ...input, code: input.code.toUpperCase(), isActive: true },
  });
  await audit({ action: 'promo.create', target: promo.id, metadata: { code: promo.code }, success: true });
  return promo;
}
