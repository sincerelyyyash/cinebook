import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupFixture, teardownFixture, type Fixture } from './fixtures.ts';
import { createShow, updateShow, deleteShow } from '../../src/services/shows.service.ts';
import { prisma } from '../../src/infra/prisma.ts';
import type { AuthUser } from '../../src/types/auth.types.ts';

let f: Fixture;
const DAY = 24 * 60 * 60 * 1000;

const asManager = (id: string): AuthUser => ({ id, role: 'HALL_MANAGER', name: 'M', email: 'm@t.dev', phoneNumber: null, isActive: true });
const asAdmin: AuthUser = { id: 'admin-test', role: 'ADMIN', name: 'A', email: 'a@t.dev', phoneNumber: null, isActive: true };

function futureAt(daysAhead: number, hourUtc: number): Date {
  const d = new Date(Date.now() + daysAhead * DAY);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

beforeAll(async () => {
  f = await setupFixture();
});
afterAll(async () => {
  await teardownFixture(f);
});

describe('show scheduling rules', () => {
  it('manager can schedule a valid show on an owned screen', async () => {
    const show = await createShow(asManager(f.managerId), {
      movieId: f.movieId,
      screenId: f.screenId,
      startsAt: futureAt(5, 6),
      format: 'TWO_D',
      basePrice: 30000,
    });
    expect(show.status).toBe('SCHEDULED');
  });

  it('rejects an overlapping show (30-min gap rule)', async () => {
    await expect(
      createShow(asManager(f.managerId), {
        movieId: f.movieId,
        screenId: f.screenId,
        startsAt: futureAt(5, 7), // starts 1h after the 06:00 show which runs 2h
        format: 'TWO_D',
        basePrice: 30000,
      }),
    ).rejects.toThrow(/gap|clash/i);
  });

  it('rejects a show in the past', async () => {
    await expect(
      createShow(asManager(f.managerId), {
        movieId: f.movieId,
        screenId: f.screenId,
        startsAt: new Date(Date.now() - DAY),
        format: 'TWO_D',
        basePrice: 30000,
      }),
    ).rejects.toThrow(/future/i);
  });

  it('rejects a show more than 30 days ahead', async () => {
    await expect(
      createShow(asManager(f.managerId), {
        movieId: f.movieId,
        screenId: f.screenId,
        startsAt: futureAt(40, 6),
        format: 'TWO_D',
        basePrice: 30000,
      }),
    ).rejects.toThrow(/30 days/i);
  });

  it('forbids a manager scheduling on a screen they do not own', async () => {
    await expect(
      createShow(asManager(f.otherManagerId), {
        movieId: f.movieId,
        screenId: f.screenId,
        startsAt: futureAt(6, 12),
        format: 'TWO_D',
        basePrice: 30000,
      }),
    ).rejects.toThrow(/assigned/i);
  });

  it('lets an admin override and schedule on any screen', async () => {
    const show = await createShow(asAdmin, {
      movieId: f.movieId,
      screenId: f.screenId,
      startsAt: futureAt(6, 12),
      format: 'TWO_D',
      basePrice: 30000,
    });
    expect(show.status).toBe('SCHEDULED');
  });

  it('blocks editing/deleting a show that has bookings', async () => {
    const show = await createShow(asManager(f.managerId), {
      movieId: f.movieId,
      screenId: f.screenId,
      startsAt: futureAt(7, 18),
      format: 'TWO_D',
      basePrice: 30000,
    });
    // simulate an existing booking
    await prisma.booking.create({
      data: { code: `CB-T${f.id.slice(0, 5)}`, userId: f.customerId, showId: show.id, status: 'CONFIRMED', subtotal: 30000, total: 30000 },
    });

    await expect(updateShow(asManager(f.managerId), show.id, { basePrice: 40000 })).rejects.toThrow(/booking/i);
    await expect(deleteShow(asManager(f.managerId), show.id)).rejects.toThrow(/booking/i);

    await prisma.booking.deleteMany({ where: { showId: show.id } });
  });
});
