import { z } from 'zod';
import type { Tool } from './registry.ts';
import { listTheatres } from '../../services/theatres.service.ts';
import { getScreenInfo } from '../../services/screens.service.ts';
import { getShowAvailability } from '../../services/availability.service.ts';
import { createHold, releaseHold } from '../../services/holds.service.ts';
import {
  createBooking,
  cancelBooking,
  getBookingStatus,
  listMyBookings,
} from '../../services/bookings.service.ts';
import { MAX_SEATS_PER_HOLD } from '../../config/constants.ts';
import type { SeatCategory } from '@prisma/client';

/**
 * Compact seat availability for the model: totals + a small sample of available
 * seat ids per category (enough to choose from without dumping ~150 seats into
 * the context).
 */
async function compactAvailability(showId: string) {
  const a = await getShowAvailability(showId);
  const byCategory: Record<string, { available: number; price: number; sample: Array<{ id: string; label: string }> }> = {};
  for (const seat of a.seats) {
    const cat = seat.category as SeatCategory;
    byCategory[cat] ??= { available: 0, price: a.priceByCategory[cat], sample: [] };
    if (seat.status === 'AVAILABLE') {
      byCategory[cat].available++;
      if (byCategory[cat].sample.length < 10) byCategory[cat].sample.push({ id: seat.id, label: `${seat.row}${seat.number}` });
    }
  }
  return {
    showId,
    movieTitle: a.movieTitle,
    theatreName: a.theatreName,
    screenName: a.screenName,
    startsAt: a.startsAt,
    summary: a.summary,
    byCategory,
  };
}

export const bookingTools: Tool[] = [
  {
    name: 'find_theatres',
    description: 'Find theatres, optionally by city or chain.',
    schema: z.object({ city: z.string().optional(), chain: z.string().optional() }),
    handler: (_ctx, i) => listTheatres({ page: 1, pageSize: 20, ...i }),
  },
  {
    name: 'get_screen_info',
    description: 'Details about a screen (type, equipment, seating capacity).',
    schema: z.object({ screenId: z.string() }),
    handler: (_ctx, i) => getScreenInfo(i.screenId),
  },
  {
    name: 'check_seat_availability',
    description:
      'Live seat availability for a show: counts and sample available seat ids per category (FRONT_ROW/STANDARD/PREMIUM/RECLINER) with prices. Use the seat ids to hold seats.',
    schema: z.object({ showId: z.string() }),
    handler: (_ctx, i) => compactAvailability(i.showId),
  },
  {
    name: 'hold_seats',
    description: `Place a 5-minute hold on specific seats (max ${MAX_SEATS_PER_HOLD}). Returns a holdId needed to create the booking.`,
    schema: z.object({ showId: z.string(), seatIds: z.array(z.string()).min(1).max(MAX_SEATS_PER_HOLD) }),
    handler: (ctx, i) => createHold(ctx.userId, i.showId, i.seatIds),
  },
  {
    name: 'release_seats',
    description: 'Release a seat hold the customer no longer wants.',
    schema: z.object({ holdId: z.string() }),
    handler: (ctx, i) => releaseHold(ctx.userId, i.holdId),
  },
  {
    name: 'create_booking',
    description: 'Create a booking from an active hold. Optionally include a promo code. Returns a PENDING booking to pay for.',
    schema: z.object({ holdId: z.string(), promoCode: z.string().optional() }),
    handler: (ctx, i) => createBooking(ctx.userId, i.holdId, i.promoCode),
  },
  {
    name: 'check_booking_status',
    description: 'Check whether a booking is pending, confirmed, cancelled, etc.',
    schema: z.object({ bookingId: z.string() }),
    handler: (ctx, i) => getBookingStatus(ctx.userId, i.bookingId),
  },
  {
    name: 'cancel_booking',
    description: 'Cancel a booking and free its seats.',
    schema: z.object({ bookingId: z.string() }),
    handler: (ctx, i) => cancelBooking(ctx.userId, i.bookingId),
  },
  {
    name: 'view_booking_history',
    description: "The customer's past and current bookings.",
    schema: z.object({}),
    handler: (ctx) => listMyBookings(ctx.userId, { page: 1, pageSize: 10 }),
  },
];
