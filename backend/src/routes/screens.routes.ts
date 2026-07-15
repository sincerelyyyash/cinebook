import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import {
  screenIdParams,
  createScreenSchema,
  updateScreenSchema,
} from '../validators/screens.validator.ts';
import {
  getScreenController,
  createScreenController,
  updateScreenController,
} from '../controllers/screens.controller.ts';

export const screenRoutes = Router();

// Public: screen info + seat map (§2.1 "get screen info", "check seat availability" builds on this).
screenRoutes.get('/:id', validate({ params: screenIdParams }), getScreenController);

// Admin: screen configuration (§1.4).
screenRoutes.post(
  '/',
  requireAuth,
  authorize('ADMIN'),
  validate({ body: createScreenSchema }),
  createScreenController,
);
screenRoutes.patch(
  '/:id',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: screenIdParams, body: updateScreenSchema }),
  updateScreenController,
);
