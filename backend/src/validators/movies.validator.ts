import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';

export const ageRatingEnum = z.enum(['U', 'UA', 'A']);
export const formatEnum = z.enum(['TWO_D', 'THREE_D']);
export const screenTypeEnum = z.enum(['STANDARD', 'IMAX', 'FOURDX', 'DOLBY_ATMOS']);

/**
 * Movie listing filters (assignment §1.2). Movie-intrinsic filters (genre,
 * language, age rating, release date) hit the movie directly; theatre chain,
 * screen type, and format filter to movies that have a matching upcoming show.
 */
export const listMoviesQuery = paginationQuery.extend({
  search: z.string().trim().min(1).max(120).optional(),
  genre: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).optional(),
  ageRating: ageRatingEnum.optional(),
  releaseDateFrom: z.coerce.date().optional(),
  releaseDateTo: z.coerce.date().optional(),
  // Show-derived filters:
  chain: z.string().trim().min(1).optional(),
  screenType: screenTypeEnum.optional(),
  format: formatEnum.optional(),
  trending: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(['releaseDate', 'title']).default('releaseDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const castMemberSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  photoUrl: z.string().url().optional(),
});

export const createMovieSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  runtimeMin: z.number().int().min(1).max(600),
  releaseDate: z.coerce.date(),
  language: z.string().trim().min(1).max(40),
  ageRating: ageRatingEnum,
  posterUrl: z.string().url().optional(),
  trailerUrl: z.string().url().optional(),
  cast: z.array(castMemberSchema).max(60).default([]),
  genres: z.array(z.string().trim().min(1)).min(1).max(10), // genre names
  isTrending: z.boolean().optional(),
});

export const updateMovieSchema = createMovieSchema.partial();

export const movieIdParams = z.object({ id: z.string().min(1) });

export const upcomingQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...paginationQuery.shape,
});

export type ListMoviesQuery = z.infer<typeof listMoviesQuery>;
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type UpcomingQuery = z.infer<typeof upcomingQuery>;
