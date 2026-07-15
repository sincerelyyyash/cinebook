import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';
import { formatEnum, screenTypeEnum } from './movies.validator.ts';

export const showIdParams = z.object({ id: z.string().min(1) });

/** Public show listing / filtering. */
export const listShowsQuery = paginationQuery.extend({
  movieId: z.string().min(1).optional(),
  screenId: z.string().min(1).optional(),
  theatreId: z.string().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  chain: z.string().trim().min(1).optional(),
  screenType: screenTypeEnum.optional(),
  format: formatEnum.optional(),
  date: z.coerce.date().optional(), // shows on this calendar day
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Grouped showtimes for one movie. */
export const showtimesQuery = z.object({
  movieId: z.string().min(1),
  city: z.string().trim().min(1).optional(),
  chain: z.string().trim().min(1).optional(),
  screenType: screenTypeEnum.optional(),
  format: formatEnum.optional(),
  date: z.coerce.date().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createShowSchema = z.object({
  movieId: z.string().min(1),
  screenId: z.string().min(1),
  startsAt: z.coerce.date(),
  format: formatEnum,
  basePrice: z.number().int().min(1000).max(200_000), // paise (₹10 – ₹2000)
});

/** Movie/screen are fixed after creation; adjust timing/format/price only. */
export const updateShowSchema = z
  .object({
    startsAt: z.coerce.date().optional(),
    format: formatEnum.optional(),
    basePrice: z.number().int().min(1000).max(200_000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export type ListShowsQuery = z.infer<typeof listShowsQuery>;
export type ShowtimesQuery = z.infer<typeof showtimesQuery>;
export type CreateShowInput = z.infer<typeof createShowSchema>;
export type UpdateShowInput = z.infer<typeof updateShowSchema>;
