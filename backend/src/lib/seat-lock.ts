import { redis } from '../infra/redis.ts';
import { SEAT_HOLD_TTL_MS } from '../config/constants.ts';

/**
 * Redis-backed seat locking — the live source of truth for "held right now".
 *
 * Each seat is a key `seat:hold:{showId}:{seatId}` whose value is the holdId
 * and whose TTL is the 5-minute hold window. Holds are all-or-nothing and
 * atomic (a Lua script), so two concurrent requests can never both grab an
 * overlapping seat set. Confirmed bookings are tracked in Postgres (the
 * BookedSeat unique constraint is the final backstop); on confirm we drop the
 * Redis locks since the seats are then permanently booked.
 */

const seatKey = (showId: string, seatId: string) => `seat:hold:${showId}:${seatId}`;

/**
 * Atomically hold all seats or none. Returns { ok: true } on success, or
 * { ok: false, conflictSeatId } naming the first seat already held.
 */
const HOLD_SCRIPT = `
for i, k in ipairs(KEYS) do
  if redis.call('EXISTS', k) == 1 then
    return {0, ARGV[i + 1]}
  end
end
for i, k in ipairs(KEYS) do
  redis.call('SET', k, ARGV[1], 'PX', tonumber(ARGV[2]))
end
return {1, ''}
`;

/** Release only the seats still owned by this holdId (safe against races). */
const RELEASE_SCRIPT = `
local released = 0
for i, k in ipairs(KEYS) do
  if redis.call('GET', k) == ARGV[1] then
    redis.call('DEL', k)
    released = released + 1
  end
end
return released
`;

export interface HoldResult {
  ok: boolean;
  conflictSeatId?: string;
}

export async function acquireSeatHold(
  showId: string,
  seatIds: string[],
  holdId: string,
  ttlMs: number = SEAT_HOLD_TTL_MS,
): Promise<HoldResult> {
  if (seatIds.length === 0) return { ok: true };
  const keys = seatIds.map((s) => seatKey(showId, s));
  // ARGV: [1]=holdId, [2]=ttlMs, [3..]=seatIds aligned with KEYS for conflict reporting.
  const argv = [holdId, String(ttlMs), ...seatIds];
  const [ok, conflict] = (await redis.eval(
    HOLD_SCRIPT,
    keys.length,
    ...keys,
    ...argv,
  )) as [number, string];
  return ok === 1 ? { ok: true } : { ok: false, conflictSeatId: conflict };
}

export async function releaseSeatHold(
  showId: string,
  seatIds: string[],
  holdId: string,
): Promise<number> {
  if (seatIds.length === 0) return 0;
  const keys = seatIds.map((s) => seatKey(showId, s));
  return (await redis.eval(RELEASE_SCRIPT, keys.length, ...keys, holdId)) as number;
}

/**
 * Live hold state for a set of seats: returns the holdId holding each seat
 * (or null). One MGET — cheap even for a full auditorium.
 */
export async function getHeldMap(
  showId: string,
  seatIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (seatIds.length === 0) return map;
  const values = await redis.mget(seatIds.map((s) => seatKey(showId, s)));
  seatIds.forEach((id, i) => map.set(id, values[i] ?? null));
  return map;
}
