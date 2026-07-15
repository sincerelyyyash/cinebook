import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { Errors } from '../lib/errors.ts';

/**
 * RBAC guard. Ensures the request is authenticated AND the user holds one of
 * the allowed roles. Chain after `requireAuth` (or standalone — it re-checks).
 *
 *   router.post('/admin/movies', authorize('ADMIN'), ...)
 *   router.post('/manager/shows', authorize('HALL_MANAGER', 'ADMIN'), ...)
 *
 * Hall-Manager *screen ownership* is a finer-grained check enforced inside the
 * relevant services, not here (a manager may hold the role but not own the
 * target screen).
 */
export function authorize(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) throw Errors.unauthorized();
    if (!user.isActive) throw Errors.forbidden('Your account has been disabled');
    if (!allowed.includes(user.role)) {
      throw Errors.forbidden(`Requires role: ${allowed.join(' or ')}`);
    }
    next();
  };
}
