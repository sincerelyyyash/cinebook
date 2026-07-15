import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route handler so thrown errors reach the error-handler
 * middleware without a try/catch in every controller.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Standard success envelope. */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
