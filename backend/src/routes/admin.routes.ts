import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import {
  reportRangeQuery,
  revenueQuery,
  topQuery,
  activityQuery,
} from '../validators/admin.validator.ts';
import {
  summaryController,
  revenueController,
  topMoviesController,
  topTheatresController,
  activityController,
} from '../controllers/admin.controller.ts';

export const adminRoutes = Router();

// Everything here is admin-only.
adminRoutes.use(requireAuth, authorize('ADMIN'));

// ── Reports (§1.4) ──────────────────────────────────────────
adminRoutes.get('/reports/summary', validate({ query: reportRangeQuery }), summaryController);
adminRoutes.get('/reports/revenue', validate({ query: revenueQuery }), revenueController);
adminRoutes.get('/reports/top-movies', validate({ query: topQuery }), topMoviesController);
adminRoutes.get('/reports/top-theatres', validate({ query: topQuery }), topTheatresController);

// ── Activity log (§1.4 / §3.1) ──────────────────────────────
adminRoutes.get('/activity', validate({ query: activityQuery }), activityController);
