import type { Request, Response } from 'express';
import { asyncHandler, created, noContent, ok } from '../lib/http.ts';
import {
  listShows,
  getShowById,
  getMovieShowtimes,
  createShow,
  updateShow,
  deleteShow,
} from '../services/shows.service.ts';
import type {
  CreateShowInput,
  ListShowsQuery,
  ShowtimesQuery,
  UpdateShowInput,
} from '../validators/shows.validator.ts';

export const listShowsController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listShows(req.query as unknown as ListShowsQuery));
});

export const showtimesController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getMovieShowtimes(req.query as unknown as ShowtimesQuery));
});

export const getShowController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getShowById(req.params.id!));
});

export const createShowController = asyncHandler(async (req: Request, res: Response) => {
  created(res, await createShow(req.user!, req.body as CreateShowInput));
});

export const updateShowController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await updateShow(req.user!, req.params.id!, req.body as UpdateShowInput));
});

export const deleteShowController = asyncHandler(async (req: Request, res: Response) => {
  await deleteShow(req.user!, req.params.id!);
  noContent(res);
});
