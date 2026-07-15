import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import { createGenreSchema } from '../validators/genres.validator.ts';
import { listGenresController, createGenreController } from '../controllers/genres.controller.ts';

export const genreRoutes = Router();

genreRoutes.get('/', listGenresController); // public
genreRoutes.post(
  '/',
  requireAuth,
  authorize('ADMIN'),
  validate({ body: createGenreSchema }),
  createGenreController,
);
