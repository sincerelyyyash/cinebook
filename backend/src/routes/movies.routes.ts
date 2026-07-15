import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import { paginationQuery } from '../lib/pagination.ts';
import {
  listMoviesQuery,
  movieIdParams,
  createMovieSchema,
  updateMovieSchema,
  upcomingQuery,
} from '../validators/movies.validator.ts';
import { createReviewSchema } from '../validators/reviews.validator.ts';
import {
  listMoviesController,
  getMovieController,
  getCastController,
  getSimilarController,
  trendingController,
  upcomingController,
  listReviewsController,
  createReviewController,
  createMovieController,
  updateMovieController,
} from '../controllers/movies.controller.ts';

export const movieRoutes = Router();

// Static/collection routes BEFORE `/:id` so they don't get captured as an id.
movieRoutes.get('/', validate({ query: listMoviesQuery }), listMoviesController);
movieRoutes.get('/trending', trendingController);
movieRoutes.get('/upcoming', validate({ query: upcomingQuery }), upcomingController);

movieRoutes.post(
  '/',
  requireAuth,
  authorize('ADMIN'),
  validate({ body: createMovieSchema }),
  createMovieController,
);

movieRoutes.get('/:id', validate({ params: movieIdParams }), getMovieController);
movieRoutes.patch(
  '/:id',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: movieIdParams, body: updateMovieSchema }),
  updateMovieController,
);
movieRoutes.get('/:id/cast', validate({ params: movieIdParams }), getCastController);
movieRoutes.get('/:id/similar', validate({ params: movieIdParams }), getSimilarController);

movieRoutes.get(
  '/:id/reviews',
  validate({ params: movieIdParams, query: paginationQuery }),
  listReviewsController,
);
movieRoutes.post(
  '/:id/reviews',
  requireAuth,
  validate({ params: movieIdParams, body: createReviewSchema }),
  createReviewController,
);
