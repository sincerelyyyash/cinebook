import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import {
  previewPromo,
  applyPromoToBooking,
  listActivePromos,
  createPromo,
} from '../services/promos.service.ts';
import type { CreatePromoInput, PreviewPromoInput } from '../validators/promos.validator.ts';
import type { ApplyPromoInput } from '../validators/bookings.validator.ts';

export const listPromosController = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await listActivePromos());
});

export const previewPromoController = asyncHandler(async (req: Request, res: Response) => {
  const { code, amount } = req.body as PreviewPromoInput;
  ok(res, await previewPromo(code, amount));
});

export const applyPromoController = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body as ApplyPromoInput;
  ok(res, await applyPromoToBooking(req.user!.id, req.params.id!, code));
});

export const createPromoController = asyncHandler(async (req: Request, res: Response) => {
  created(res, await createPromo(req.body as CreatePromoInput));
});
