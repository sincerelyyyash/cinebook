import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import {
  listTheatresQuery,
  theatreIdParams,
  createTheatreSchema,
  updateTheatreSchema,
} from '../validators/theatres.validator.ts';
import {
  listTheatresController,
  getTheatreController,
  listTheatreScreensController,
  createTheatreController,
  updateTheatreController,
} from '../controllers/theatres.controller.ts';

export const theatreRoutes = Router();

theatreRoutes.get('/', validate({ query: listTheatresQuery }), listTheatresController);
theatreRoutes.post(
  '/',
  requireAuth,
  authorize('ADMIN'),
  validate({ body: createTheatreSchema }),
  createTheatreController,
);
theatreRoutes.get('/:id', validate({ params: theatreIdParams }), getTheatreController);
theatreRoutes.patch(
  '/:id',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: theatreIdParams, body: updateTheatreSchema }),
  updateTheatreController,
);
theatreRoutes.get('/:id/screens', validate({ params: theatreIdParams }), listTheatreScreensController);
