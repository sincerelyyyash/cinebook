import type { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { SHOW_CLEANING_GAP_MINUTES, SHOW_MAX_ADVANCE_DAYS } from '../config/constants.ts';
import type { AuthUser } from '../types/auth.types.ts';

const GAP_MS = SHOW_CLEANING_GAP_MINUTES * 60 * 1000;
const MAX_ADVANCE_MS = SHOW_MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

/** endsAt = startsAt + runtime. Cleaning gap is applied only during validation. */
export function computeEndsAt(startsAt: Date, runtimeMin: number): Date {
  return new Date(startsAt.getTime() + runtimeMin * 60 * 1000);
}

/**
 * Rule: shows may only be scheduled in the future and at most 30 days ahead
 * (§1.3). Throws an explainable SHOW_RULE_VIOLATION otherwise.
 */
export function assertWithinWindow(startsAt: Date, now = new Date()): void {
  if (startsAt.getTime() <= now.getTime()) {
    throw Errors.showRule('A show must start in the future.', {
      rule: 'future_only',
      startsAt,
    });
  }
  if (startsAt.getTime() > now.getTime() + MAX_ADVANCE_MS) {
    throw Errors.showRule(
      `Shows can only be scheduled up to ${SHOW_MAX_ADVANCE_DAYS} days in advance.`,
      { rule: 'max_advance_days', maxDays: SHOW_MAX_ADVANCE_DAYS, startsAt },
    );
  }
}

/**
 * Rule: no two shows on the same screen may overlap, and there must be at least
 * a 30-minute cleaning gap between them (§1.3). Two shows conflict when the
 * new one starts before an existing one ends + gap, AND the existing one starts
 * before the new one ends + gap. Runs inside the caller's transaction.
 */
export async function assertNoScheduleConflict(
  tx: Prisma.TransactionClient,
  screenId: string,
  startsAt: Date,
  endsAt: Date,
  excludeShowId?: string,
): Promise<void> {
  const newStart = startsAt.getTime();
  const newEnd = endsAt.getTime();

  // Candidate window: any SCHEDULED show on this screen that could be within
  // gap distance of the new one.
  const candidates = await tx.show.findMany({
    where: {
      screenId,
      status: 'SCHEDULED',
      ...(excludeShowId ? { id: { not: excludeShowId } } : {}),
      startsAt: { lt: new Date(newEnd + GAP_MS) },
      endsAt: { gt: new Date(newStart - GAP_MS) },
    },
    select: { id: true, startsAt: true, endsAt: true, movie: { select: { title: true } } },
  });

  const clash = candidates.find((c) => {
    const eS = c.startsAt.getTime();
    const eE = c.endsAt.getTime();
    return newEnd + GAP_MS > eS && eE + GAP_MS > newStart;
  });

  if (clash) {
    throw Errors.showRule(
      `This clashes with "${clash.movie.title}" on the same screen. Shows need a ${SHOW_CLEANING_GAP_MINUTES}-minute gap for cleaning.`,
      {
        rule: 'overlap_or_gap',
        cleaningGapMinutes: SHOW_CLEANING_GAP_MINUTES,
        conflictingShowId: clash.id,
        conflictingWindow: { startsAt: clash.startsAt, endsAt: clash.endsAt },
      },
    );
  }
}

/**
 * Rule: shows with existing bookings can't be changed or deleted (§1.3).
 * PENDING (in-progress) and CONFIRMED both count as "has bookings".
 */
export async function assertNoBookings(showId: string, action: 'edit' | 'delete'): Promise<void> {
  const count = await prisma.booking.count({
    where: { showId, status: { in: ['PENDING', 'CONFIRMED'] } },
  });
  if (count > 0) {
    throw Errors.showRule(
      `This show already has ${count} booking(s) and can no longer be ${action === 'edit' ? 'changed' : 'deleted'}.`,
      { rule: 'immutable_when_booked', bookings: count },
    );
  }
}

/**
 * RBAC (fine-grained): a Hall Manager may only touch shows on screens assigned
 * to them; Admins may override for any screen (§1.4). Returns the screen +
 * theatre so callers can reuse it.
 */
export async function assertCanManageScreen(user: AuthUser, screenId: string) {
  const screen = await prisma.screen.findUnique({
    where: { id: screenId },
    include: { theatre: true },
  });
  if (!screen) throw Errors.notFound('Screen');

  if (user.role === 'ADMIN') return screen;
  if (user.role === 'HALL_MANAGER' && screen.managerId === user.id) return screen;

  throw Errors.forbidden('You can only manage shows for screens assigned to you.');
}

/** Serialize scheduling per-screen to prevent TOCTOU races on the overlap check. */
export async function lockScreen(tx: Prisma.TransactionClient, screenId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${screenId}))`;
}
