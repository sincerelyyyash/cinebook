import { afterAll } from 'bun:test';

// Quiet app logs during tests (must run before any app module imports env).
process.env.LOG_LEVEL = 'fatal';
process.env.OTP_DEV_ECHO = 'true';

/**
 * Global teardown: the app's Prisma/Redis/BullMQ singletons connect on import,
 * so close them once after the whole suite to let the test process exit cleanly.
 * (The suite requires `docker compose up` — Postgres + Redis.)
 */
afterAll(async () => {
  try {
    const { disconnectPrisma } = await import('../src/infra/prisma.ts');
    const { disconnectRedis } = await import('../src/infra/redis.ts');
    const { closeQueues } = await import('../src/infra/queues/index.ts');
    await Promise.allSettled([closeQueues(), disconnectPrisma(), disconnectRedis()]);
  } catch {
    // best effort
  }
});
