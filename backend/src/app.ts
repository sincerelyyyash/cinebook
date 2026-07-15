import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOrigins } from './config/env.ts';
import { requestContext } from './middleware/request-context.ts';
import { attachUser } from './middleware/authenticate.ts';
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts';
import { apiRouter } from './routes/index.ts';
import { register } from './observability/metrics.ts';

/**
 * Builds the Express application (no listen) so it can be imported by tests
 * and by server.ts. Middleware order matters:
 *   security → parsing → request-context (traceId) → user attach → routes → 404 → error.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct req.ip behind a proxy (rate limiting)

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestContext);
  app.use(attachUser); // optional auth; routes enforce with requireAuth/authorize

  app.get('/', (_req, res) => {
    res.json({ data: { name: 'CineBook API', status: 'ok' } });
  });

  // Prometheus scrape endpoint (§3.1 Key Metrics).
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
