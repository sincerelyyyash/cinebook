import { describe, it, expect } from 'bun:test';
import type { Promo } from '@prisma/client';
import { assertWithinWindow, computeEndsAt } from '../../src/services/show-scheduling.service.ts';
import { priceByCategory } from '../../src/services/shows.service.ts';
import { computeDiscount } from '../../src/services/promos.service.ts';
import { generateSeats } from '../../src/services/screens.service.ts';
import { SEAT_CATEGORY_MULTIPLIER } from '../../src/config/constants.ts';
import { isAppError } from '../../src/lib/errors.ts';

describe('show scheduling — window rules', () => {
  const now = new Date('2026-07-14T00:00:00Z');

  it('computes endsAt as startsAt + runtime', () => {
    const start = new Date('2026-07-15T10:00:00Z');
    expect(computeEndsAt(start, 120).toISOString()).toBe('2026-07-15T12:00:00.000Z');
  });

  it('accepts a valid near-future start', () => {
    expect(() => assertWithinWindow(new Date('2026-07-16T10:00:00Z'), now)).not.toThrow();
  });

  it('rejects a start in the past', () => {
    try {
      assertWithinWindow(new Date('2026-07-13T10:00:00Z'), now);
      throw new Error('should have thrown');
    } catch (e) {
      expect(isAppError(e) && e.code).toBe('SHOW_RULE_VIOLATION');
    }
  });

  it('rejects a start more than 30 days ahead', () => {
    try {
      assertWithinWindow(new Date('2026-08-20T10:00:00Z'), now);
      throw new Error('should have thrown');
    } catch (e) {
      expect(isAppError(e) && e.code).toBe('SHOW_RULE_VIOLATION');
    }
  });
});

describe('seat pricing', () => {
  it('applies category multipliers to the base price', () => {
    const p = priceByCategory(25000);
    expect(p.STANDARD).toBe(Math.round(25000 * SEAT_CATEGORY_MULTIPLIER.STANDARD));
    expect(p.RECLINER).toBe(Math.round(25000 * SEAT_CATEGORY_MULTIPLIER.RECLINER));
    expect(p.FRONT_ROW).toBeLessThan(p.STANDARD);
    expect(p.RECLINER).toBeGreaterThan(p.PREMIUM);
  });
});

describe('promo discount', () => {
  const base = (over: Partial<Promo>): Promo =>
    ({
      id: 'p', code: 'X', description: '', percentOff: null, flatOff: null,
      maxDiscount: null, minAmount: null, validFrom: new Date(), validTo: new Date(),
      usageLimit: null, usedCount: 0, isActive: true, ...over,
    }) as Promo;

  it('applies a percentage discount', () => {
    expect(computeDiscount(base({ percentOff: 20 }), 50000)).toBe(10000);
  });

  it('caps a percentage discount at maxDiscount', () => {
    expect(computeDiscount(base({ percentOff: 50, maxDiscount: 15000 }), 80000)).toBe(15000);
  });

  it('applies a flat discount', () => {
    expect(computeDiscount(base({ flatOff: 10000 }), 30000)).toBe(10000);
  });

  it('never exceeds the order amount', () => {
    expect(computeDiscount(base({ flatOff: 99999 }), 20000)).toBe(20000);
  });
});

describe('seat-layout generator', () => {
  it('expands row bands into individual seats', () => {
    const seats = generateSeats({
      rows: [
        { row: 'A', seats: 3, category: 'FRONT_ROW' },
        { row: 'B', seats: 2, category: 'RECLINER' },
      ],
    });
    expect(seats).toHaveLength(5);
    expect(seats[0]).toEqual({ row: 'A', number: 1, category: 'FRONT_ROW' });
    expect(seats[2]).toEqual({ row: 'A', number: 3, category: 'FRONT_ROW' });
    expect(seats[4]).toEqual({ row: 'B', number: 2, category: 'RECLINER' });
  });
});
