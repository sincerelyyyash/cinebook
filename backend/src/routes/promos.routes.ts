import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import { previewPromoSchema, createPromoSchema } from '../validators/promos.validator.ts';
import {
  listPromosController,
  previewPromoController,
  createPromoController,
} from '../controllers/promos.controller.ts';

export const promoRoutes = Router();

promoRoutes.get('/', listPromosController); // public: current offers
promoRoutes.post('/apply', requireAuth, validate({ body: previewPromoSchema }), previewPromoController);
promoRoutes.post(
  '/',
  requireAuth,
  authorize('ADMIN'),
  validate({ body: createPromoSchema }),
  createPromoController,
);
