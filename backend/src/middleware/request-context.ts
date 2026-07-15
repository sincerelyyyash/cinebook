import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { runWithContext, type RequestContext } from '../lib/async-context.ts';
import { logger } from '../lib/logger.ts';
import { httpRequestDuration, httpRequestsTotal, normalizeRoute } from '../observability/metrics.ts';

/**
 * Entry middleware. Mints (or accepts) a trace id, binds a request-scoped
 * context via AsyncLocalStorage so every downstream log/activity-log/metric
 * is correlatable, and emits a structured access log on completion with
 * latency — satisfying the "follow a single interaction start-to-finish" and
 * "identify slowdowns" observability goals (§3.1).
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-trace-id');
  const traceId = incoming && incoming.length <= 64 ? incoming : nanoid();
  const startedAt = performance.now();

  const ctx: RequestContext = { traceId, startedAt };
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  runWithContext(ctx, () => {
    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      // Prefer the matched route pattern; fall back to a normalized path.
      const route = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : normalizeRoute(req.originalUrl.split('?')[0] ?? req.path);
      const labels = { method: req.method, route, status: String(res.statusCode) };
      httpRequestDuration.observe(labels, durationMs);
      httpRequestsTotal.inc(labels);

      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs,
        },
        'request completed',
      );
    });
    next();
  });
}
