import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { Errors } from '../lib/errors.ts';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate + coerce request parts against Zod schemas at the boundary.
 * On success, replaces req.body/query/params with the parsed (typed) values.
 * On failure, throws a 400 VALIDATION_ERROR with structured field issues.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        // Express 5's req.query is a getter-only property; assign parsed values individually.
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.defineProperty(req, 'query', { value: parsed, configurable: true });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw Errors.validation('Request validation failed', formatZodIssues(err));
      }
      throw err;
    }
  };
}

function formatZodIssues(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
}

/** Helper to infer the parsed body type from a schema in controllers. */
export type Infer<T extends ZodTypeAny> = z.infer<T>;
