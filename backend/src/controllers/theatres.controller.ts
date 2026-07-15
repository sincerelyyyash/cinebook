import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import {
  listTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
} from '../services/theatres.service.ts';
import { listScreensByTheatre } from '../services/screens.service.ts';
import type {
  CreateTheatreInput,
  ListTheatresQuery,
  UpdateTheatreInput,
} from '../validators/theatres.validator.ts';

export const listTheatresController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listTheatres(req.query as unknown as ListTheatresQuery));
});

export const getTheatreController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getTheatreById(req.params.id!));
});

export const listTheatreScreensController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listScreensByTheatre(req.params.id!));
});

export const createTheatreController = asyncHandler(async (req: Request, res: Response) => {
  created(res, await createTheatre(req.body as CreateTheatreInput));
});

export const updateTheatreController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await updateTheatre(req.params.id!, req.body as UpdateTheatreInput));
});
