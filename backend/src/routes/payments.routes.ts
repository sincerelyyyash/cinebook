import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { paymentParams, confirmPaymentSchema } from '../validators/payments.validator.ts';
import {
  startPaymentController,
  confirmPaymentController,
  refundController,
} from '../controllers/payments.controller.ts';

export const paymentRoutes = Router();

paymentRoutes.use(requireAuth);

paymentRoutes.post('/:bookingId/start', validate({ params: paymentParams }), startPaymentController);
paymentRoutes.post(
  '/:bookingId/confirm',
  validate({ params: paymentParams, body: confirmPaymentSchema }),
  confirmPaymentController,
);
paymentRoutes.post('/:bookingId/refund', validate({ params: paymentParams }), refundController);
