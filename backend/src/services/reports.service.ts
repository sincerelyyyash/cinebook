import { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';

/**
 * Booking & revenue reporting (§1.4 Reports). Revenue counts CONFIRMED
 * bookings; refunds are reported separately. Money is paise.
 */

export type Granularity = 'daily' | 'weekly' | 'monthly';

const TRUNC_UNIT: Record<Granularity, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

export interface ReportRange {
  from?: Date;
  to?: Date;
}

function rangeWhere(range: ReportRange): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (range.from) clauses.push(Prisma.sql`"createdAt" >= ${range.from}`);
  if (range.to) clauses.push(Prisma.sql`"createdAt" <= ${range.to}`);
  return clauses.length ? Prisma.sql`AND ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}

export interface ReportSummary {
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  refundedBookings: number;
  seatsSold: number;
  grossRevenue: number; // paise, CONFIRMED
  refundedAmount: number; // paise
  netRevenue: number; // gross - refunded
}

export async function getSummary(range: ReportRange = {}): Promise<ReportSummary> {
  const where = rangeWhere(range);

  const [statusRows] = await Promise.all([
    prisma.$queryRaw<Array<{ status: string; count: bigint; revenue: number }>>(Prisma.sql`
      SELECT status, count(*)::int AS count, COALESCE(sum(total), 0)::float8 AS revenue
      FROM "Booking"
      WHERE 1=1 ${where}
      GROUP BY status
    `),
  ]);

  const byStatus = new Map(statusRows.map((r) => [r.status, r]));
  const get = (s: string) => byStatus.get(s) ?? { count: 0, revenue: 0 };

  const seatsSoldRows = await prisma.$queryRaw<Array<{ seats: number }>>(Prisma.sql`
    SELECT count(*)::int AS seats
    FROM "BookedSeat" bs
    JOIN "Booking" b ON b.id = bs."bookingId"
    WHERE b.status = 'CONFIRMED' ${rangePrefixed(range, 'b')}
  `);

  const grossRevenue = Number(get('CONFIRMED').revenue);
  const refundedAmount = Number(get('REFUNDED').revenue);

  return {
    confirmedBookings: Number(get('CONFIRMED').count),
    pendingBookings: Number(get('PENDING').count),
    cancelledBookings: Number(get('CANCELLED').count),
    refundedBookings: Number(get('REFUNDED').count),
    seatsSold: seatsSoldRows[0]?.seats ?? 0,
    grossRevenue,
    refundedAmount,
    netRevenue: grossRevenue - refundedAmount,
  };
}

function rangePrefixed(range: ReportRange, alias: string): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (range.from) clauses.push(Prisma.sql`${Prisma.raw(alias)}."createdAt" >= ${range.from}`);
  if (range.to) clauses.push(Prisma.sql`${Prisma.raw(alias)}."createdAt" <= ${range.to}`);
  return clauses.length ? Prisma.sql`AND ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}

export interface RevenuePoint {
  period: string; // ISO date
  bookings: number;
  revenue: number; // paise
}

/** Revenue + booking counts bucketed by day/week/month. */
export async function getRevenueTimeseries(
  granularity: Granularity,
  range: ReportRange = {},
): Promise<RevenuePoint[]> {
  const unit = TRUNC_UNIT[granularity];
  const rows = await prisma.$queryRaw<Array<{ period: Date; bookings: number; revenue: number }>>(Prisma.sql`
    SELECT date_trunc(${unit}, "createdAt") AS period,
           count(*)::int AS bookings,
           COALESCE(sum(total), 0)::float8 AS revenue
    FROM "Booking"
    WHERE status = 'CONFIRMED' ${rangeWhere(range)}
    GROUP BY period
    ORDER BY period ASC
  `);
  return rows.map((r) => ({
    period: r.period.toISOString(),
    bookings: Number(r.bookings),
    revenue: Number(r.revenue),
  }));
}

export interface TopMovie {
  movieId: string;
  title: string;
  bookings: number;
  revenue: number;
}

export async function getTopMovies(limit = 10, range: ReportRange = {}): Promise<TopMovie[]> {
  const rows = await prisma.$queryRaw<
    Array<{ movieId: string; title: string; bookings: number; revenue: number }>
  >(Prisma.sql`
    SELECT m.id AS "movieId", m.title AS title,
           count(b.id)::int AS bookings,
           COALESCE(sum(b.total), 0)::float8 AS revenue
    FROM "Booking" b
    JOIN "Show" s ON s.id = b."showId"
    JOIN "Movie" m ON m.id = s."movieId"
    WHERE b.status = 'CONFIRMED' ${rangePrefixed(range, 'b')}
    GROUP BY m.id, m.title
    ORDER BY revenue DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    movieId: r.movieId,
    title: r.title,
    bookings: Number(r.bookings),
    revenue: Number(r.revenue),
  }));
}

export interface TopTheatre {
  theatreId: string;
  name: string;
  chain: string;
  bookings: number;
  revenue: number;
}

export async function getTopTheatres(limit = 10, range: ReportRange = {}): Promise<TopTheatre[]> {
  const rows = await prisma.$queryRaw<
    Array<{ theatreId: string; name: string; chain: string; bookings: number; revenue: number }>
  >(Prisma.sql`
    SELECT t.id AS "theatreId", t.name AS name, t.chain AS chain,
           count(b.id)::int AS bookings,
           COALESCE(sum(b.total), 0)::float8 AS revenue
    FROM "Booking" b
    JOIN "Show" s ON s.id = b."showId"
    JOIN "Screen" sc ON sc.id = s."screenId"
    JOIN "Theatre" t ON t.id = sc."theatreId"
    WHERE b.status = 'CONFIRMED' ${rangePrefixed(range, 'b')}
    GROUP BY t.id, t.name, t.chain
    ORDER BY revenue DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    theatreId: r.theatreId,
    name: r.name,
    chain: r.chain,
    bookings: Number(r.bookings),
    revenue: Number(r.revenue),
  }));
}
