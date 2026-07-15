import type { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import { audit } from './activity-log.service.ts';
import type { CastMember, MovieDetail, MovieSummary } from '../types/movies.types.ts';
import type {
  CreateMovieInput,
  ListMoviesQuery,
  UpcomingQuery,
  UpdateMovieInput,
} from '../validators/movies.validator.ts';

type MovieRow = Prisma.MovieGetPayload<{ include: { genres: { include: { genre: true } } } }>;

/** Ratings for a set of movies in one query (avoids N+1). */
async function ratingsFor(movieIds: string[]) {
  if (movieIds.length === 0) return new Map<string, { average: number; count: number }>();
  const groups = await prisma.review.groupBy({
    by: ['movieId'],
    where: { movieId: { in: movieIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map<string, { average: number; count: number }>();
  for (const g of groups) {
    map.set(g.movieId, {
      average: Math.round((g._avg.rating ?? 0) * 10) / 10,
      count: g._count._all,
    });
  }
  return map;
}

function toSummary(m: MovieRow, rating: { average: number; count: number }): MovieSummary {
  return {
    id: m.id,
    title: m.title,
    runtimeMin: m.runtimeMin,
    releaseDate: m.releaseDate,
    language: m.language,
    ageRating: m.ageRating,
    posterUrl: m.posterUrl,
    genres: m.genres.map((mg) => mg.genre.name),
    isTrending: m.isTrending,
    rating,
  };
}

function toDetail(m: MovieRow, rating: { average: number; count: number }): MovieDetail {
  return {
    ...toSummary(m, rating),
    description: m.description,
    trailerUrl: m.trailerUrl,
    cast: (m.cast as unknown as CastMember[]) ?? [],
  };
}

const withGenres = { genres: { include: { genre: true } } } as const;

export async function listMovies(query: ListMoviesQuery) {
  const showFilter: Prisma.ShowWhereInput | undefined =
    query.chain || query.screenType || query.format
      ? {
          status: 'SCHEDULED',
          startsAt: { gte: new Date() },
          ...(query.format ? { format: query.format } : {}),
          screen: {
            ...(query.screenType ? { screenType: query.screenType } : {}),
            ...(query.chain ? { theatre: { chain: { equals: query.chain, mode: 'insensitive' } } } : {}),
          },
        }
      : undefined;

  const where: Prisma.MovieWhereInput = {
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.language ? { language: { equals: query.language, mode: 'insensitive' } } : {}),
    ...(query.ageRating ? { ageRating: query.ageRating } : {}),
    ...(query.trending !== undefined ? { isTrending: query.trending } : {}),
    ...(query.genre
      ? { genres: { some: { genre: { name: { equals: query.genre, mode: 'insensitive' } } } } }
      : {}),
    ...(query.releaseDateFrom || query.releaseDateTo
      ? {
          releaseDate: {
            ...(query.releaseDateFrom ? { gte: query.releaseDateFrom } : {}),
            ...(query.releaseDateTo ? { lte: query.releaseDateTo } : {}),
          },
        }
      : {}),
    ...(showFilter ? { shows: { some: showFilter } } : {}),
  };

  const params: PaginationParams = { page: query.page, pageSize: query.pageSize };
  const [rows, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      include: withGenres,
      orderBy: { [query.sort]: query.order },
      ...toPrismaSkipTake(params),
    }),
    prisma.movie.count({ where }),
  ]);

  const ratings = await ratingsFor(rows.map((r) => r.id));
  const data = rows.map((r) => toSummary(r, ratings.get(r.id) ?? { average: 0, count: 0 }));
  return paginate(data, total, params);
}

export async function getMovieById(id: string): Promise<MovieDetail> {
  const movie = await prisma.movie.findUnique({ where: { id }, include: withGenres });
  if (!movie) throw Errors.notFound('Movie');
  const ratings = await ratingsFor([id]);
  return toDetail(movie, ratings.get(id) ?? { average: 0, count: 0 });
}

/** Distinct languages available in the catalog. */
export async function listLanguages(): Promise<string[]> {
  const rows = await prisma.movie.findMany({ distinct: ['language'], select: { language: true }, orderBy: { language: 'asc' } });
  return rows.map((r) => r.language);
}

export async function getCast(id: string): Promise<{ movieId: string; title: string; cast: CastMember[] }> {
  const movie = await prisma.movie.findUnique({ where: { id }, select: { id: true, title: true, cast: true } });
  if (!movie) throw Errors.notFound('Movie');
  return { movieId: movie.id, title: movie.title, cast: (movie.cast as unknown as CastMember[]) ?? [] };
}

/** Trending = flagged trending, most recent first. */
export async function getTrending(limit = 10): Promise<MovieSummary[]> {
  const rows = await prisma.movie.findMany({
    where: { isTrending: true },
    include: withGenres,
    orderBy: { releaseDate: 'desc' },
    take: limit,
  });
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return rows.map((r) => toSummary(r, ratings.get(r.id) ?? { average: 0, count: 0 }));
}

/** Upcoming = release date in the future (optionally within a window). */
export async function getUpcoming(query: UpcomingQuery) {
  const from = query.from ?? new Date();
  const where: Prisma.MovieWhereInput = {
    releaseDate: { gte: from, ...(query.to ? { lte: query.to } : {}) },
  };
  const params: PaginationParams = { page: query.page, pageSize: query.pageSize };
  const [rows, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      include: withGenres,
      orderBy: { releaseDate: 'asc' },
      ...toPrismaSkipTake(params),
    }),
    prisma.movie.count({ where }),
  ]);
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return paginate(
    rows.map((r) => toSummary(r, ratings.get(r.id) ?? { average: 0, count: 0 })),
    total,
    params,
  );
}

/**
 * Suggest similar movies: shares the most genres, same-ish language preferred.
 * Simple heuristic (the chatbot leans on this for "if you liked X, try Y").
 */
export async function suggestSimilar(id: string, limit = 6): Promise<MovieSummary[]> {
  const base = await prisma.movie.findUnique({ where: { id }, include: withGenres });
  if (!base) throw Errors.notFound('Movie');
  const genreNames = base.genres.map((g) => g.genre.name);

  const rows = await prisma.movie.findMany({
    where: {
      id: { not: id },
      genres: { some: { genre: { name: { in: genreNames } } } },
    },
    include: withGenres,
    take: 30,
  });

  // rank by shared-genre count, then same language
  const ranked = rows
    .map((m) => {
      const shared = m.genres.filter((g) => genreNames.includes(g.genre.name)).length;
      const sameLang = m.language === base.language ? 1 : 0;
      return { m, score: shared * 10 + sameLang };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.m);

  const ratings = await ratingsFor(ranked.map((r) => r.id));
  return ranked.map((r) => toSummary(r, ratings.get(r.id) ?? { average: 0, count: 0 }));
}

// ── Admin CRUD (§1.4 Movie Catalog) ─────────────────────────
export async function createMovie(input: CreateMovieInput): Promise<MovieDetail> {
  const movie = await prisma.movie.create({
    data: {
      title: input.title,
      description: input.description,
      runtimeMin: input.runtimeMin,
      releaseDate: input.releaseDate,
      language: input.language,
      ageRating: input.ageRating,
      posterUrl: input.posterUrl,
      trailerUrl: input.trailerUrl,
      cast: input.cast as unknown as Prisma.InputJsonValue,
      isTrending: input.isTrending ?? false,
      genres: {
        create: input.genres.map((name) => ({
          genre: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
    },
    include: withGenres,
  });
  await audit({ action: 'movie.create', target: movie.id, metadata: { title: movie.title }, success: true });
  return toDetail(movie, { average: 0, count: 0 });
}

export async function updateMovie(id: string, input: UpdateMovieInput): Promise<MovieDetail> {
  const existing = await prisma.movie.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Movie');

  const movie = await prisma.$transaction(async (tx) => {
    if (input.genres) {
      await tx.movieGenre.deleteMany({ where: { movieId: id } });
    }
    return tx.movie.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.runtimeMin !== undefined ? { runtimeMin: input.runtimeMin } : {}),
        ...(input.releaseDate !== undefined ? { releaseDate: input.releaseDate } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.ageRating !== undefined ? { ageRating: input.ageRating } : {}),
        ...(input.posterUrl !== undefined ? { posterUrl: input.posterUrl } : {}),
        ...(input.trailerUrl !== undefined ? { trailerUrl: input.trailerUrl } : {}),
        ...(input.isTrending !== undefined ? { isTrending: input.isTrending } : {}),
        ...(input.cast !== undefined ? { cast: input.cast as unknown as Prisma.InputJsonValue } : {}),
        ...(input.genres
          ? {
              genres: {
                create: input.genres.map((name) => ({
                  genre: { connectOrCreate: { where: { name }, create: { name } } },
                })),
              },
            }
          : {}),
      },
      include: withGenres,
    });
  });

  await audit({ action: 'movie.update', target: id, metadata: { fields: Object.keys(input) }, success: true });
  const ratings = await ratingsFor([id]);
  return toDetail(movie, ratings.get(id) ?? { average: 0, count: 0 });
}
