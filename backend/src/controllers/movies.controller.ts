import type { Request, Response } from 'express';
import { asyncHandler, created, ok } from '../lib/http.ts';
import {
  listMovies,
  getMovieById,
  getCast,
  getTrending,
  getUpcoming,
  suggestSimilar,
  createMovie,
  updateMovie,
} from '../services/movies.service.ts';
import { listMovieReviews, createReview } from '../services/reviews.service.ts';
import type {
  CreateMovieInput,
  ListMoviesQuery,
  UpcomingQuery,
  UpdateMovieInput,
} from '../validators/movies.validator.ts';
import type { CreateReviewInput } from '../validators/reviews.validator.ts';

export const listMoviesController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listMovies(req.query as unknown as ListMoviesQuery));
});

export const getMovieController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getMovieById(req.params.id!));
});

export const getCastController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getCast(req.params.id!));
});

export const getSimilarController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await suggestSimilar(req.params.id!));
});

export const trendingController = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await getTrending());
});

export const upcomingController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getUpcoming(req.query as unknown as UpcomingQuery));
});

export const listReviewsController = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; pageSize: number };
  ok(res, await listMovieReviews(req.params.id!, q));
});

export const createReviewController = asyncHandler(async (req: Request, res: Response) => {
  const review = await createReview(req.params.id!, req.user!.id, req.body as CreateReviewInput);
  created(res, review);
});

// ── Admin ───────────────────────────────────────────────────
export const createMovieController = asyncHandler(async (req: Request, res: Response) => {
  created(res, await createMovie(req.body as CreateMovieInput));
});

export const updateMovieController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await updateMovie(req.params.id!, req.body as UpdateMovieInput));
});
