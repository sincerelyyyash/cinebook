import type { Prisma, SeatCategory } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import { SEAT_CATEGORY_MULTIPLIER } from '../config/constants.ts';
import { audit } from './activity-log.service.ts';
import {
  assertCanManageScreen,
  assertNoBookings,
  assertNoScheduleConflict,
  assertWithinWindow,
  computeEndsAt,
  lockScreen,
} from './show-scheduling.service.ts';
import type {
  ShowDetail,
  ShowSummary,
  ShowtimeTheatreGroup,
} from '../types/shows.types.ts';
import type { AuthUser } from '../types/auth.types.ts';
import type {
  CreateShowInput,
  ListShowsQuery,
  ShowtimesQuery,
  UpdateShowInput,
} from '../validators/shows.validator.ts';

const SHOW_INCLUDE = {
  movie: { select: { id: true, title: true, runtimeMin: true } },
  screen: {
    select: {
      id: true,
      name: true,
      screenType: true,
      theatre: { select: { id: true, name: true, chain: true, city: true } },
    },
  },
} satisfies Prisma.ShowInclude;

type ShowRow = Prisma.ShowGetPayload<{ include: typeof SHOW_INCLUDE }>;

function toSummary(s: ShowRow): ShowSummary {
  return {
    id: s.id,
    movieId: s.movie.id,
    movieTitle: s.movie.title,
    screenId: s.screen.id,
    screenName: s.screen.name,
    screenType: s.screen.screenType,
    theatreId: s.screen.theatre.id,
    theatreName: s.screen.theatre.name,
    theatreChain: s.screen.theatre.chain,
    city: s.screen.theatre.city,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    format: s.format,
    basePrice: s.basePrice,
    status: s.status,
  };
}

export function priceByCategory(basePrice: number): Record<SeatCategory, number> {
  return {
    FRONT_ROW: Math.round(basePrice * SEAT_CATEGORY_MULTIPLIER.FRONT_ROW),
    STANDARD: Math.round(basePrice * SEAT_CATEGORY_MULTIPLIER.STANDARD),
    PREMIUM: Math.round(basePrice * SEAT_CATEGORY_MULTIPLIER.PREMIUM),
    RECLINER: Math.round(basePrice * SEAT_CATEGORY_MULTIPLIER.RECLINER),
  };
}

function toDetail(s: ShowRow): ShowDetail {
  return {
    ...toSummary(s),
    runtimeMin: s.movie.runtimeMin,
    priceByCategory: priceByCategory(s.basePrice),
  };
}

function dayRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

function buildShowWhere(q: {
  movieId?: string;
  screenId?: string;
  theatreId?: string;
  city?: string;
  chain?: string;
  screenType?: ListShowsQuery['screenType'];
  format?: ListShowsQuery['format'];
  date?: Date;
  from?: Date;
  to?: Date;
  onlyUpcoming?: boolean;
}): Prisma.ShowWhereInput {
  const timeFilter: Prisma.DateTimeFilter = {};
  if (q.date) Object.assign(timeFilter, dayRange(q.date));
  if (q.from) timeFilter.gte = q.from;
  if (q.to) timeFilter.lte = q.to;
  if (q.onlyUpcoming && !q.date && !q.from) timeFilter.gte = new Date();

  return {
    ...(q.movieId ? { movieId: q.movieId } : {}),
    ...(q.screenId ? { screenId: q.screenId } : {}),
    ...(q.format ? { format: q.format } : {}),
    ...(Object.keys(timeFilter).length ? { startsAt: timeFilter } : {}),
    screen: {
      ...(q.screenType ? { screenType: q.screenType } : {}),
      ...(q.theatreId ? { theatreId: q.theatreId } : {}),
      ...(q.city || q.chain
        ? {
            theatre: {
              ...(q.city ? { city: { equals: q.city, mode: 'insensitive' } } : {}),
              ...(q.chain ? { chain: { equals: q.chain, mode: 'insensitive' } } : {}),
            },
          }
        : {}),
    },
  };
}

// ── Reads ───────────────────────────────────────────────────
export async function listShows(query: ListShowsQuery) {
  const where: Prisma.ShowWhereInput = {
    status: 'SCHEDULED',
    ...buildShowWhere({ ...query, onlyUpcoming: true }),
  };
  const params: PaginationParams = { page: query.page, pageSize: query.pageSize };
  const [rows, total] = await Promise.all([
    prisma.show.findMany({
      where,
      include: SHOW_INCLUDE,
      orderBy: { startsAt: 'asc' },
      ...toPrismaSkipTake(params),
    }),
    prisma.show.count({ where }),
  ]);
  return paginate(rows.map(toSummary), total, params);
}

export async function getShowById(id: string): Promise<ShowDetail> {
  const show = await prisma.show.findUnique({ where: { id }, include: SHOW_INCLUDE });
  if (!show) throw Errors.notFound('Show');
  return toDetail(show);
}

/** Grouped showtimes for a movie (theatre → date → shows). */
export async function getMovieShowtimes(query: ShowtimesQuery): Promise<{
  movieId: string;
  movieTitle: string;
  theatres: ShowtimeTheatreGroup[];
}> {
  const movie = await prisma.movie.findUnique({
    where: { id: query.movieId },
    select: { id: true, title: true },
  });
  if (!movie) throw Errors.notFound('Movie');

  const where: Prisma.ShowWhereInput = {
    status: 'SCHEDULED',
    ...buildShowWhere({ ...query, onlyUpcoming: true }),
  };
  const rows = await prisma.show.findMany({
    where,
    include: SHOW_INCLUDE,
    orderBy: { startsAt: 'asc' },
  });

  // Group theatre → date → shows.
  const theatres = new Map<string, ShowtimeTheatreGroup>();
  for (const s of rows) {
    const t = s.screen.theatre;
    let tg = theatres.get(t.id);
    if (!tg) {
      tg = { theatreId: t.id, theatreName: t.name, chain: t.chain, city: t.city, dates: [] };
      theatres.set(t.id, tg);
    }
    const dateKey = s.startsAt.toISOString().slice(0, 10);
    let dg = tg.dates.find((d) => d.date === dateKey);
    if (!dg) {
      dg = { date: dateKey, shows: [] };
      tg.dates.push(dg);
    }
    dg.shows.push({
      showId: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      format: s.format,
      screenId: s.screen.id,
      screenName: s.screen.name,
      screenType: s.screen.screenType,
      basePrice: s.basePrice,
    });
  }

  return { movieId: movie.id, movieTitle: movie.title, theatres: [...theatres.values()] };
}

// ── Mutations (Hall Manager / Admin) ────────────────────────
export async function createShow(user: AuthUser, input: CreateShowInput): Promise<ShowDetail> {
  const screen = await assertCanManageScreen(user, input.screenId);
  const movie = await prisma.movie.findUnique({
    where: { id: input.movieId },
    select: { id: true, runtimeMin: true },
  });
  if (!movie) throw Errors.notFound('Movie');

  const endsAt = computeEndsAt(input.startsAt, movie.runtimeMin);
  assertWithinWindow(input.startsAt);

  const showId = await prisma.$transaction(async (tx) => {
    await lockScreen(tx, screen.id);
    await assertNoScheduleConflict(tx, screen.id, input.startsAt, endsAt);
    const show = await tx.show.create({
      data: {
        movieId: input.movieId,
        screenId: input.screenId,
        startsAt: input.startsAt,
        endsAt,
        format: input.format,
        basePrice: input.basePrice,
      },
      select: { id: true },
    });
    return show.id;
  });

  await audit({
    action: 'show.create',
    target: showId,
    metadata: { movieId: input.movieId, screenId: input.screenId, startsAt: input.startsAt },
    success: true,
  });
  return getShowById(showId);
}

export async function updateShow(
  user: AuthUser,
  id: string,
  input: UpdateShowInput,
): Promise<ShowDetail> {
  const show = await prisma.show.findUnique({
    where: { id },
    include: { movie: { select: { runtimeMin: true } } },
  });
  if (!show) throw Errors.notFound('Show');

  await assertCanManageScreen(user, show.screenId);
  await assertNoBookings(id, 'edit');

  const startsAt = input.startsAt ?? show.startsAt;
  const endsAt = input.startsAt ? computeEndsAt(input.startsAt, show.movie.runtimeMin) : show.endsAt;
  if (input.startsAt) assertWithinWindow(input.startsAt);

  await prisma.$transaction(async (tx) => {
    await lockScreen(tx, show.screenId);
    if (input.startsAt) {
      await assertNoScheduleConflict(tx, show.screenId, startsAt, endsAt, id);
    }
    await tx.show.update({
      where: { id },
      data: {
        ...(input.startsAt ? { startsAt, endsAt } : {}),
        ...(input.format ? { format: input.format } : {}),
        ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
      },
    });
  });

  await audit({ action: 'show.update', target: id, metadata: { fields: Object.keys(input) }, success: true });
  return getShowById(id);
}

export async function deleteShow(user: AuthUser, id: string): Promise<void> {
  const show = await prisma.show.findUnique({ where: { id }, select: { id: true, screenId: true } });
  if (!show) throw Errors.notFound('Show');

  await assertCanManageScreen(user, show.screenId);
  await assertNoBookings(id, 'delete');

  await prisma.show.delete({ where: { id } });
  await audit({ action: 'show.delete', target: id, success: true });
}
