import { describe, it, expect } from 'bun:test';
import { normalizeRoute } from '../../src/observability/metrics.ts';

describe('normalizeRoute', () => {
  it('collapses cuid ids', () => {
    expect(normalizeRoute('/api/movies/ckabcdefghij1234567890')).toBe('/api/movies/:id');
  });
  it('collapses hold ids and booking codes', () => {
    expect(normalizeRoute('/api/bookings/holds/h_abc123')).toBe('/api/bookings/holds/:id');
    expect(normalizeRoute('/api/bookings/CB-8F3K2Q')).toBe('/api/bookings/:code');
  });
  it('collapses numeric segments', () => {
    expect(normalizeRoute('/api/x/42')).toBe('/api/x/:n');
  });
  it('leaves static routes unchanged', () => {
    expect(normalizeRoute('/api/movies/trending')).toBe('/api/movies/trending');
  });
});
