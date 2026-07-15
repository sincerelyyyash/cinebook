import type { SeatCategory } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { getHeldMap } from '../lib/seat-lock.ts';
import { priceByCategory } from './shows.service.ts';
import type { SeatAvailability, SeatStatus, ShowAvailability } from '../types/booking.types.ts';

/**
 * Live seat availability for a show:
 *   AVAILABLE = free · HELD = in someone's 5-min hold (Redis) · BOOKED = confirmed.
 *
 * Booked seats come from Postgres (BookedSeat exists only for CONFIRMED
 * bookings); held seats come from Redis (true TTL state). `viewerHoldId`
 * lets the caller see their own held seats as selectable.
 */
export async function getShowAvailability(
  showId: string,
  viewerHoldId?: string,
): Promise<ShowAvailability> {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    include: {
      movie: { select: { title: true } },
      screen: {
        select: {
          name: true,
          theatre: { select: { name: true } },
          seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
        },
      },
    },
  });
  if (!show) throw Errors.notFound('Show');

  const seats = show.screen.seats;
  const seatIds = seats.map((s) => s.id);

  const [bookedRows, heldMap] = await Promise.all([
    prisma.bookedSeat.findMany({ where: { showId }, select: { seatId: true } }),
    getHeldMap(showId, seatIds),
  ]);
  const bookedSet = new Set(bookedRows.map((b) => b.seatId));

  const prices = priceByCategory(show.basePrice);
  const summary = { total: seats.length, available: 0, held: 0, booked: 0 };

  const seatList: SeatAvailability[] = seats.map((seat) => {
    const heldBy = heldMap.get(seat.id) ?? null;
    let status: SeatStatus;
    if (bookedSet.has(seat.id)) status = 'BOOKED';
    else if (heldBy) status = 'HELD';
    else status = 'AVAILABLE';

    if (status === 'BOOKED') summary.booked++;
    else if (status === 'HELD') summary.held++;
    else summary.available++;

    return {
      id: seat.id,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      price: prices[seat.category],
      status,
      heldByMe: heldBy != null && heldBy === viewerHoldId,
    };
  });

  return {
    showId,
    movieTitle: show.movie.title,
    screenName: show.screen.name,
    theatreName: show.screen.theatre.name,
    startsAt: show.startsAt,
    format: show.format,
    priceByCategory: prices,
    summary,
    seats: seatList,
  };
}

/** Look up seat rows for a show's screen, validating they all belong to it. */
export async function resolveSeatsForShow(showId: string, seatIds: string[]) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: { id: true, status: true, startsAt: true, basePrice: true, screenId: true },
  });
  if (!show) throw Errors.notFound('Show');

  const seats = await prisma.seat.findMany({
    where: { id: { in: seatIds }, screenId: show.screenId },
    select: { id: true, row: true, number: true, category: true },
  });
  if (seats.length !== seatIds.length) {
    throw Errors.validation('One or more seats do not belong to this show’s screen');
  }
  return { show, seats } as const;
}

export function seatLabel(row: string, number: number): string {
  return `${row}${number}`;
}

export function priceForCategory(basePrice: number, category: SeatCategory): number {
  return priceByCategory(basePrice)[category];
}
