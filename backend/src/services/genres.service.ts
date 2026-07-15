import { prisma } from '../infra/prisma.ts';
import { audit } from './activity-log.service.ts';

export interface GenreWithCount {
  id: string;
  name: string;
  movieCount: number;
}

/** List genres with how many movies each has (useful for the chatbot). */
export async function listGenres(): Promise<GenreWithCount[]> {
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { movies: true } } },
  });
  return genres.map((g) => ({ id: g.id, name: g.name, movieCount: g._count.movies }));
}

export async function createGenre(name: string): Promise<GenreWithCount> {
  const genre = await prisma.genre.create({ data: { name } });
  await audit({ action: 'genre.create', target: genre.id, metadata: { name }, success: true });
  return { id: genre.id, name: genre.name, movieCount: 0 };
}
