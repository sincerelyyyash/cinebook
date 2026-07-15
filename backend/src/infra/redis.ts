import { Redis } from 'ioredis';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

/**
 * Redis connections.
 *
 * We keep two clients:
 *  - `redis`      — general cache / seat-lock / rate-limiter usage.
 *  - `bullConnection` — a dedicated connection for BullMQ. BullMQ requires
 *    `maxRetriesPerRequest: null` and manages blocking commands, so it must
 *    NOT share the general-purpose client.
 */
const globalForRedis = globalThis as unknown as {
  redis?: Redis;
  bullConnection?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

export const bullConnection =
  globalForRedis.bullConnection ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

redis.on('error', (e) => logger.error({ err: e.message }, 'redis error'));
redis.on('connect', () => logger.info('✅ Redis connected'));

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
  globalForRedis.bullConnection = bullConnection;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), bullConnection.quit()]);
  logger.info('Redis disconnected');
}
