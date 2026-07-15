import { pingDatabase } from '../infra/prisma.ts';
import { pingRedis } from '../infra/redis.ts';

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptimeSec: number;
  timestamp: string;
  dependencies: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

/** Liveness (process is up) vs readiness (deps reachable). */
export async function checkHealth(): Promise<HealthReport> {
  const [db, cache] = await Promise.all([pingDatabase(), pingRedis()]);
  const healthy = db && cache;
  return {
    status: healthy ? 'ok' : 'degraded',
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies: {
      database: db ? 'up' : 'down',
      redis: cache ? 'up' : 'down',
    },
  };
}
