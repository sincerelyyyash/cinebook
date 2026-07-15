import { Worker, type Job } from 'bullmq';
import { bullConnection } from './infra/redis.ts';
import { connectPrisma, disconnectPrisma } from './infra/prisma.ts';
import { disconnectRedis } from './infra/redis.ts';
import { QUEUE_NAMES, type SeatHoldExpiryJob } from './infra/queues/index.ts';
import { expireHold } from './services/holds.service.ts';
import { logger } from './lib/logger.ts';

/**
 * BullMQ worker process. Runs separately from the API (`bun run dev:worker`)
 * so background jobs scale independently and never block request handling.
 *
 * Phase 0 registers the seat-hold expiry worker as a stub; Phase 4 fills in
 * the release logic (delete Redis locks + mark SeatHold EXPIRED).
 */
const log = childLog('worker');

function childLog(name: string) {
  return logger.child({ component: name });
}

async function main() {
  await connectPrisma();

  const seatHoldWorker = new Worker<SeatHoldExpiryJob>(
    QUEUE_NAMES.seatHold,
    async (job: Job<SeatHoldExpiryJob>) => {
      await expireHold(job.data.holdId);
      log.info({ jobId: job.id, holdId: job.data.holdId }, 'seat-hold expiry processed');
    },
    { connection: bullConnection, concurrency: 10 },
  );

  seatHoldWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: err.message }, 'seat-hold job failed');
  });

  const workers = [seatHoldWorker];
  log.info('👷 CineBook worker started');

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'worker shutting down…');
    await Promise.allSettled(workers.map((w) => w.close()));
    await Promise.allSettled([disconnectPrisma(), disconnectRedis()]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start worker');
  process.exit(1);
});
