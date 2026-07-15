import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import { createHold, releaseHold } from '../services/holds.service.ts';
import {
  createBooking,
  confirmBooking,
  cancelBooking,
  getBooking,
  getBookingStatus,
  listMyBookings,
} from '../services/bookings.service.ts';
import { getShowAvailability } from '../services/availability.service.ts';
import type { CreateBookingInput, CreateHoldInput } from '../validators/bookings.validator.ts';

// ── Seat availability (public) ──────────────────────────────
export const showSeatsController = asyncHandler(async (req: Request, res: Response) => {
  const holdId = (req.query as { holdId?: string }).holdId;
  ok(res, await getShowAvailability(req.params.id!, holdId));
});

// ── Holds ───────────────────────────────────────────────────
export const createHoldController = asyncHandler(async (req: Request, res: Response) => {
  const { showId, seatIds } = req.body as CreateHoldInput;
  created(res, await createHold(req.user!.id, showId, seatIds));
});

export const releaseHoldController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await releaseHold(req.user!.id, req.params.id!));
});

// ── Bookings ────────────────────────────────────────────────
export const createBookingController = asyncHandler(async (req: Request, res: Response) => {
  const { holdId, promoCode } = req.body as CreateBookingInput;
  created(res, await createBooking(req.user!.id, holdId, promoCode));
});

export const confirmBookingController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await confirmBooking(req.user!.id, req.params.id!));
});

export const cancelBookingController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await cancelBooking(req.user!.id, req.params.id!));
});

export const getBookingController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getBooking(req.user!.id, req.params.id!));
});

export const bookingStatusController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getBookingStatus(req.user!.id, req.params.id!));
});

export const listBookingsController = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; pageSize: number };
  ok(res, await listMyBookings(req.user!.id, q));
});
