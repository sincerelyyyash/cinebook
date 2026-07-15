import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import {
  showIdParams,
  listShowsQuery,
  showtimesQuery,
  createShowSchema,
  updateShowSchema,
} from '../validators/shows.validator.ts';
import { seatsQuery } from '../validators/bookings.validator.ts';
import { showSeatsController } from '../controllers/bookings.controller.ts';
import {
  listShowsController,
  showtimesController,
  getShowController,
  createShowController,
  updateShowController,
  deleteShowController,
} from '../controllers/shows.controller.ts';

export const showRoutes = Router();

// ── Public reads ────────────────────────────────────────────
showRoutes.get('/', validate({ query: listShowsQuery }), listShowsController);
showRoutes.get('/showtimes', validate({ query: showtimesQuery }), showtimesController);
showRoutes.get('/:id', validate({ params: showIdParams }), getShowController);
showRoutes.get('/:id/seats', validate({ params: showIdParams, query: seatsQuery }), showSeatsController);

// ── Scheduling (Hall Manager for own screens, Admin override) ──
const scheduler = [requireAuth, authorize('HALL_MANAGER', 'ADMIN')] as const;

showRoutes.post('/', ...scheduler, validate({ body: createShowSchema }), createShowController);
showRoutes.patch(
  '/:id',
  ...scheduler,
  validate({ params: showIdParams, body: updateShowSchema }),
  updateShowController,
);
showRoutes.delete('/:id', ...scheduler, validate({ params: showIdParams }), deleteShowController);
