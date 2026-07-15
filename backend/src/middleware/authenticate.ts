import type { Request, Response, NextFunction } from 'express';
import { resolveSession } from '../auth/session-resolver.ts';
import { setContext } from '../lib/async-context.ts';
import { Errors } from '../lib/errors.ts';
import { asyncHandler } from '../lib/http.ts';

/**
 * Populates `req.user` from the session if present. Does NOT reject anonymous
 * requests — use `requireAuth` / `authorize` to enforce access. This lets
 * routes be optionally-authenticated (e.g. public movie browsing that
 * personalizes when logged in).
 */
export const attachUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const session = await resolveSession(req);
  if (session) {
    req.user = session.user;
    setContext({ userId: session.user.id, userRole: session.user.role });
  }
  next();
});

/** Hard gate: 401 unless authenticated (and the account is active). */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      const session = await resolveSession(req);
      if (!session) throw Errors.unauthorized();
      req.user = session.user;
      setContext({ userId: session.user.id, userRole: session.user.role });
    }
    if (!req.user.isActive) throw Errors.forbidden('Your account has been disabled');
    next();
  },
);
