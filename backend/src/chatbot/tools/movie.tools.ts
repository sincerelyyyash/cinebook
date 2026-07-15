import { z } from 'zod';
import type { Tool } from './registry.ts';
import * as movies from '../../services/movies.service.ts';
import { listGenres } from '../../services/genres.service.ts';
import { listMovieReviews } from '../../services/reviews.service.ts';
import { getMovieShowtimes } from '../../services/shows.service.ts';

const ageRating = z.enum(['U', 'UA', 'A']);
const screenType = z.enum(['STANDARD', 'IMAX', 'FOURDX', 'DOLBY_ATMOS']);
const format = z.enum(['TWO_D', 'THREE_D']);

/** Fill listMovies' required paging/sort fields with sensible defaults. */
function movieQuery(f: Record<string, unknown>) {
  return { page: 1, pageSize: 10, sort: 'releaseDate' as const, order: 'desc' as const, ...f };
}

export const movieTools: Tool[] = [
  {
    name: 'search_movies',
    description:
      'Search/filter movies now showing. Use for "what sci-fi is playing", "action movies in Hindi", etc. Returns movie ids to use in follow-up actions.',
    schema: z.object({
      query: z.string().optional().describe('free-text title search'),
      genre: z.string().optional(),
      language: z.string().optional(),
      ageRating: ageRating.optional(),
      chain: z.string().optional().describe('theatre chain e.g. PVR, INOX, Cinepolis'),
      screenType: screenType.optional(),
      format: format.optional(),
    }),
    handler: (_ctx, i) => movies.listMovies(movieQuery({ ...i, search: i.query })),
  },
  {
    name: 'get_movie_details',
    description: 'Full details for one movie (description, runtime, rating, genres).',
    schema: z.object({ movieId: z.string() }),
    handler: (_ctx, i) => movies.getMovieById(i.movieId),
  },
  {
    name: 'get_cast',
    description: 'Cast & crew for a movie.',
    schema: z.object({ movieId: z.string() }),
    handler: (_ctx, i) => movies.getCast(i.movieId),
  },
  {
    name: 'get_reviews',
    description: 'Recent user reviews and average rating for a movie.',
    schema: z.object({ movieId: z.string() }),
    handler: (_ctx, i) => listMovieReviews(i.movieId, { page: 1, pageSize: 5 }),
  },
  {
    name: 'get_showtimes',
    description:
      'Showtimes for a movie, grouped by theatre and date. Optionally filter by city, chain, screen type or format. Returns show ids for booking.',
    schema: z.object({
      movieId: z.string(),
      city: z.string().optional(),
      chain: z.string().optional(),
      screenType: screenType.optional(),
      format: format.optional(),
    }),
    handler: (_ctx, i) => getMovieShowtimes({ ...i }),
  },
  {
    name: 'suggest_similar',
    description: 'Movies similar to a given one ("if you liked X, try Y").',
    schema: z.object({ movieId: z.string() }),
    handler: (_ctx, i) => movies.suggestSimilar(i.movieId),
  },
  {
    name: 'get_trending',
    description: 'Movies that are popular / trending right now.',
    schema: z.object({}),
    handler: () => movies.getTrending(),
  },
  {
    name: 'get_upcoming',
    description: 'Movies releasing soon.',
    schema: z.object({}),
    handler: () => movies.getUpcoming({ page: 1, pageSize: 10 }),
  },
  {
    name: 'list_languages',
    description: 'Languages available in the catalog.',
    schema: z.object({}),
    handler: () => movies.listLanguages(),
  },
  {
    name: 'list_genres',
    description: 'Available movie genres.',
    schema: z.object({}),
    handler: () => listGenres(),
  },
];
