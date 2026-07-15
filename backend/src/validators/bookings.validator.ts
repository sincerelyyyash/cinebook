import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';
import { MAX_SEATS_PER_HOLD } from '../config/constants.ts';

export const createHoldSchema = z.object({
  showId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1).max(MAX_SEATS_PER_HOLD),
});

export const holdIdParams = z.object({ id: z.string().min(1) });

export const createBookingSchema = z.object({
  holdId: z.string().min(1),
  promoCode: z.string().trim().min(1).max(40).optional(),
});

export const bookingIdParams = z.object({ id: z.string().min(1) });

export const listBookingsQuery = paginationQuery;

export const seatsQuery = z.object({ holdId: z.string().min(1).optional() });

export const applyPromoSchema = z.object({ code: z.string().trim().min(1).max(40) });

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ApplyPromoInput = z.infer<typeof applyPromoSchema>;
