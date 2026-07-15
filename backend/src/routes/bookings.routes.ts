import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { bookingRateLimiter } from '../middleware/rate-limit.ts';
import { paginationQuery } from '../lib/pagination.ts';
import {
  createHoldSchema,
  holdIdParams,
  createBookingSchema,
  bookingIdParams,
  listBookingsQuery,
  applyPromoSchema,
} from '../validators/bookings.validator.ts';
import { applyPromoController } from '../controllers/promos.controller.ts';
import {
  createHoldController,
  releaseHoldController,
  createBookingController,
  confirmBookingController,
  cancelBookingController,
  getBookingController,
  bookingStatusController,
  listBookingsController,
} from '../controllers/bookings.controller.ts';

export const bookingRoutes = Router();

// All booking routes require authentication.
bookingRoutes.use(requireAuth);

// ── Holds (5-minute seat reservations) ──────────────────────
bookingRoutes.post('/holds', validate({ body: createHoldSchema }), createHoldController);
bookingRoutes.delete('/holds/:id', validate({ params: holdIdParams }), releaseHoldController);

// ── Bookings ────────────────────────────────────────────────
// Booking creation is rate-limited to 5/hour/user (§3.3).
bookingRoutes.post('/', bookingRateLimiter, validate({ body: createBookingSchema }), createBookingController);
bookingRoutes.get('/', validate({ query: listBookingsQuery }), listBookingsController);
bookingRoutes.get('/:id', validate({ params: bookingIdParams }), getBookingController);
bookingRoutes.get('/:id/status', validate({ params: bookingIdParams }), bookingStatusController);
bookingRoutes.post('/:id/confirm', validate({ params: bookingIdParams }), confirmBookingController);
bookingRoutes.post('/:id/cancel', validate({ params: bookingIdParams }), cancelBookingController);
bookingRoutes.post(
  '/:id/promo',
  validate({ params: bookingIdParams, body: applyPromoSchema }),
  applyPromoController,
);
