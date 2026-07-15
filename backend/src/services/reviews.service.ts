import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import type { CreateReviewInput } from '../validators/reviews.validator.ts';

export interface ReviewDto {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export async function listMovieReviews(movieId: string, params: PaginationParams) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) throw Errors.notFound('Movie');

  const [rows, total, agg] = await Promise.all([
    prisma.review.findMany({
      where: { movieId },
      orderBy: { createdAt: 'desc' },
      ...toPrismaSkipTake(params),
    }),
    prisma.review.count({ where: { movieId } }),
    prisma.review.aggregate({ where: { movieId }, _avg: { rating: true } }),
  ]);

  const page = paginate<ReviewDto>(
    rows.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    total,
    params,
  );
  return { ...page, averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10 };
}

/** Authenticated user posts a review; author is taken from their profile name. */
export async function createReview(
  movieId: string,
  userId: string,
  input: CreateReviewInput,
): Promise<ReviewDto> {
  const [movie, user] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  if (!movie) throw Errors.notFound('Movie');

  const review = await prisma.review.create({
    data: {
      movieId,
      author: user?.name ?? 'CineBook User',
      rating: input.rating,
      comment: input.comment,
    },
  });
  return {
    id: review.id,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  };
}
