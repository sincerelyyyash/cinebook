import type { AuthUser } from './auth.types.ts';

/**
 * Augment Express' Request with the authenticated user and the request's
 * trace id (also available via AsyncLocalStorage, mirrored here for handlers).
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      traceId?: string;
    }
  }
}

export {};
