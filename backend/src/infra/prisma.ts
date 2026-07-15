import { PrismaClient } from '@prisma/client';
import { env, isProd } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

/**
 * Single PrismaClient for the process. Guarded against hot-reload duplication
 * in dev (Bun --watch) via a global cache.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd
      ? [{ level: 'error', emit: 'event' }]
      : [
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ],
  });

prisma.$on('error' as never, (e: unknown) => logger.error({ prisma: e }, 'prisma error'));
prisma.$on('warn' as never, (e: unknown) => logger.warn({ prisma: e }, 'prisma warning'));

if (!isProd) globalForPrisma.prisma = prisma;

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Prisma connected');
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
