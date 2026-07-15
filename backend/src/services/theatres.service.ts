import type { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import { audit } from './activity-log.service.ts';
import type { TheatreDetail, TheatreSummary } from '../types/venue.types.ts';
import type {
  CreateTheatreInput,
  ListTheatresQuery,
  UpdateTheatreInput,
} from '../validators/theatres.validator.ts';

function toSummary(t: {
  id: string;
  chain: string;
  name: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  _count: { screens: number };
}): TheatreSummary {
  return {
    id: t.id,
    chain: t.chain,
    name: t.name,
    city: t.city,
    address: t.address,
    location: t.lat != null && t.lng != null ? { lat: t.lat, lng: t.lng } : null,
    screenCount: t._count.screens,
  };
}

export async function listTheatres(query: ListTheatresQuery) {
  const where: Prisma.TheatreWhereInput = {
    ...(query.chain ? { chain: { equals: query.chain, mode: 'insensitive' } } : {}),
    ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const params: PaginationParams = { page: query.page, pageSize: query.pageSize };
  const [rows, total] = await Promise.all([
    prisma.theatre.findMany({
      where,
      include: { _count: { select: { screens: true } } },
      orderBy: [{ chain: 'asc' }, { name: 'asc' }],
      ...toPrismaSkipTake(params),
    }),
    prisma.theatre.count({ where }),
  ]);
  return paginate(rows.map(toSummary), total, params);
}

export async function getTheatreById(id: string): Promise<TheatreDetail> {
  const t = await prisma.theatre.findUnique({
    where: { id },
    include: {
      _count: { select: { screens: true } },
      screens: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { seats: true } } },
      },
    },
  });
  if (!t) throw Errors.notFound('Theatre');
  return {
    ...toSummary(t),
    screens: t.screens.map((s) => ({
      id: s.id,
      name: s.name,
      screenType: s.screenType,
      seatingCapacity: s._count.seats,
    })),
  };
}

export async function createTheatre(input: CreateTheatreInput): Promise<TheatreSummary> {
  const t = await prisma.theatre.create({
    data: input,
    include: { _count: { select: { screens: true } } },
  });
  await audit({ action: 'theatre.create', target: t.id, metadata: { name: t.name, chain: t.chain }, success: true });
  return toSummary(t);
}

export async function updateTheatre(id: string, input: UpdateTheatreInput): Promise<TheatreSummary> {
  const existing = await prisma.theatre.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Theatre');
  const t = await prisma.theatre.update({
    where: { id },
    data: input,
    include: { _count: { select: { screens: true } } },
  });
  await audit({ action: 'theatre.update', target: id, metadata: { fields: Object.keys(input) }, success: true });
  return toSummary(t);
}
