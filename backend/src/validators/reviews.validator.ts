import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';

export const movieIdParams = z.object({ movieId: z.string().min(1) });

export const listReviewsQuery = paginationQuery;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
