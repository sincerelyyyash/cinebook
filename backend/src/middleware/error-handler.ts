import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, Errors, isAppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { isProd } from '../config/env.ts';
import { errorsTotal } from '../observability/metrics.ts';

/** 404 for unmatched routes — mounted after all routers. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(Errors.notFound(`Route ${req.method} ${req.path}`));
}

/**
 * Single error translation point. Domain errors map to their status/code;
 * known Prisma errors are mapped to sensible HTTP; anything else becomes a
 * logged 500 with a sanitized client message. Never leaks internals in prod.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const appError = normalize(err);
  errorsTotal.inc({ code: appError.code });

  const logPayload = {
    err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    code: appError.code,
    status: appError.status,
    method: req.method,
    path: req.originalUrl,
  };

  if (appError.status >= 500) logger.error(logPayload, 'request failed');
  else logger.warn(logPayload, 'request rejected');

  const body = appError.toJSON();
  // In prod, hide details on 500s.
  if (isProd && appError.status >= 500) {
    body.error.message = 'Something went wrong';
    body.error.details = undefined;
  }
  res.status(appError.status).json({ ...body, traceId: req.traceId });
}

function normalize(err: unknown): AppError {
  if (isAppError(err)) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // unique constraint
        return Errors.conflict('A record with these values already exists', {
          target: err.meta?.target,
        });
      case 'P2025': // record not found
        return Errors.notFound('Record');
      case 'P2003': // FK constraint
        return Errors.validation('Referenced record does not exist', { meta: err.meta });
      default:
        return Errors.internal('Database error', err);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return Errors.validation('Invalid database query');
  }

  return Errors.internal('Unhandled error', err);
}
