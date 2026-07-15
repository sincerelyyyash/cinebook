import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../lib/http.ts';
import { startPayment, confirmPayment } from '../services/payments.service.ts';
import { refundBooking } from '../services/bookings.service.ts';
import type { ConfirmPaymentInput } from '../validators/payments.validator.ts';

export const startPaymentController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await startPayment(req.user!.id, req.params.bookingId!));
});

export const confirmPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const { cardNumber } = req.body as ConfirmPaymentInput;
  ok(res, await confirmPayment(req.user!.id, req.params.bookingId!, cardNumber));
});

export const refundController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await refundBooking(req.user!.id, req.params.bookingId!));
});
