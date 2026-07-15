import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import { listGenres, createGenre } from '../services/genres.service.ts';
import type { CreateGenreInput } from '../validators/genres.validator.ts';

export const listGenresController = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await listGenres());
});

export const createGenreController = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body as CreateGenreInput;
  created(res, await createGenre(name));
});
