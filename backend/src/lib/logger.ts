import pino from 'pino';
import { env, isProd } from '../config/env.ts';
import { getContext } from './async-context.ts';

/**
 * Structured logger. In dev it pretty-prints; in prod it emits JSON.
 * Every log line is auto-enriched with the current request's traceId/userId
 * via a mixin that reads AsyncLocalStorage — so logs are correlatable
 * end-to-end without passing the logger around.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'cinebook-backend' },
  mixin() {
    const ctx = getContext();
    if (!ctx) return {};
    return { traceId: ctx.traceId, userId: ctx.userId };
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service',
        },
      },
});

/** Child logger scoped to a module/component. */
export function childLogger(component: string) {
  return logger.child({ component });
}
