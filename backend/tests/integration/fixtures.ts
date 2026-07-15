import type { SeatCategory } from '@prisma/client';
import { prisma } from '../../src/infra/prisma.ts';

/** Unique suffix so parallel/repeated runs never collide. */
export function uid(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function seatRows(): Array<{ row: string; number: number; category: SeatCategory }> {
  const bands: Array<[string, SeatCategory]> = [
    ['A', 'FRONT_ROW'],
    ['B', 'FRONT_ROW'],
    ['C', 'STANDARD'],
    ['D', 'STANDARD'],
    ['E', 'PREMIUM'],
    ['F', 'RECLINER'],
  ];
  const seats: Array<{ row: string; number: number; category: SeatCategory }> = [];
  for (const [row, category] of bands) {
    for (let n = 1; n <= 6; n++) seats.push({ row, number: n, category });
  }
  return seats;
}

export interface Fixture {
  id: string;
  movieId: string;
  theatreId: string;
  screenId: string;
  showId: string;
  managerId: string;
  otherManagerId: string;
  customerId: string;
  customer2Id: string;
  seatIds: string[];
  standardSeatIds: string[];
}

const DAY = 24 * 60 * 60 * 1000;

/** Create an isolated movie/theatre/screen(+seats)/show + users for a test. */
export async function setupFixture(): Promise<Fixture> {
  const id = uid();

  const movie = await prisma.movie.create({
    data: {
      title: `Test Movie ${id}`,
      description: 'A test film',
      runtimeMin: 120,
      releaseDate: new Date(Date.now() - DAY),
      language: 'English',
      ageRating: 'UA',
      cast: [{ name: 'Test Actor', role: 'Lead' }],
    },
  });

  const manager = await prisma.user.create({
    data: { name: `Mgr ${id}`, email: `mgr-${id}@test.dev`, phoneNumber: `+900${id}`, role: 'HALL_MANAGER' },
  });
  const otherManager = await prisma.user.create({
    data: { name: `Mgr2 ${id}`, email: `mgr2-${id}@test.dev`, phoneNumber: `+901${id}`, role: 'HALL_MANAGER' },
  });
  const customer = await prisma.user.create({
    data: { name: `Cust ${id}`, email: `cust-${id}@test.dev`, phoneNumber: `+902${id}`, role: 'CUSTOMER' },
  });
  const customer2 = await prisma.user.create({
    data: { name: `Cust2 ${id}`, email: `cust2-${id}@test.dev`, phoneNumber: `+903${id}`, role: 'CUSTOMER' },
  });

  const theatre = await prisma.theatre.create({
    data: { chain: `TESTCHAIN-${id}`, name: `Test Theatre ${id}`, city: `Testville-${id}`, address: '1 Test St' },
  });

  const screen = await prisma.screen.create({
    data: {
      theatreId: theatre.id,
      name: 'Screen 1',
      screenType: 'STANDARD',
      equipment: ['2K'],
      managerId: manager.id,
      seats: { create: seatRows() },
    },
    include: { seats: true },
  });

  const startsAt = new Date(Date.now() + 2 * DAY);
  startsAt.setUTCHours(10, 0, 0, 0);
  const show = await prisma.show.create({
    data: {
      movieId: movie.id,
      screenId: screen.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 120 * 60000),
      format: 'TWO_D',
      basePrice: 25000,
    },
  });

  return {
    id,
    movieId: movie.id,
    theatreId: theatre.id,
    screenId: screen.id,
    showId: show.id,
    managerId: manager.id,
    otherManagerId: otherManager.id,
    customerId: customer.id,
    customer2Id: customer2.id,
    seatIds: screen.seats.map((s) => s.id),
    standardSeatIds: screen.seats.filter((s) => s.category === 'STANDARD').map((s) => s.id),
  };
}

/** Remove everything the fixture created (FK-safe order). */
export async function teardownFixture(f: Fixture): Promise<void> {
  const bookings = await prisma.booking.findMany({ where: { showId: f.showId }, select: { id: true } });
  const bookingIds = bookings.map((b) => b.id);
  await prisma.bookedSeat.deleteMany({ where: { showId: f.showId } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { showId: f.showId } });
  await prisma.seatHold.deleteMany({ where: { showId: f.showId } });
  // shows created during scheduling tests may exceed the fixture's one show:
  await prisma.show.deleteMany({ where: { screenId: f.screenId } });
  await prisma.seat.deleteMany({ where: { screenId: f.screenId } });
  await prisma.screen.deleteMany({ where: { id: f.screenId } });
  await prisma.theatre.deleteMany({ where: { id: f.theatreId } });
  await prisma.movieGenre.deleteMany({ where: { movieId: f.movieId } });
  await prisma.review.deleteMany({ where: { movieId: f.movieId } });
  await prisma.movie.deleteMany({ where: { id: f.movieId } });
  await prisma.user.deleteMany({
    where: { id: { in: [f.managerId, f.otherManagerId, f.customerId, f.customer2Id] } },
  });
}
