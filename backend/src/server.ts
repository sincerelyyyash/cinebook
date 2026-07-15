import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { connectPrisma, disconnectPrisma } from './infra/prisma.ts';
import { disconnectRedis } from './infra/redis.ts';
import { closeQueues } from './infra/queues/index.ts';
import { attachWebSocket } from './realtime/ws.ts';

async function main() {
  await connectPrisma();

  const app = createApp();
  const server = createServer(app);
  attachWebSocket(server); // live seat availability at ws://…/ws

  server.listen(env.PORT, () => {
    logger.info(`🎬 CineBook API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down…');
    // Stop accepting new connections, then drain resources.
    server.close(async () => {
      await Promise.allSettled([closeQueues(), disconnectPrisma(), disconnectRedis()]);
      logger.info('shutdown complete');
      process.exit(0);
    });
    // Hard exit if graceful shutdown stalls.
    setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start server');
  process.exit(1);
});
