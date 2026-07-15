import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import { getScreenInfo, createScreen, updateScreen } from '../services/screens.service.ts';
import type { CreateScreenInput, UpdateScreenInput } from '../validators/screens.validator.ts';

export const getScreenController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getScreenInfo(req.params.id!));
});

export const createScreenController = asyncHandler(async (req: Request, res: Response) => {
  created(res, await createScreen(req.body as CreateScreenInput));
});

export const updateScreenController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await updateScreen(req.params.id!, req.body as UpdateScreenInput));
});
