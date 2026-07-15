import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { Role } from '@prisma/client';
import { auth } from './better-auth.ts';
import type { ResolvedSession } from '../types/auth.types.ts';

/**
 * Resolves the authenticated session from a request via Better Auth.
 * Reads the `Authorization: Bearer <token>` header (bearer plugin) and
 * validates it against the session store. Returns null when anonymous.
 *
 * `authenticate`/`authorize` middleware consume this — they don't know or
 * care that Better Auth is behind it.
 */
export async function resolveSession(req: Request): Promise<ResolvedSession | null> {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) return null;

  const { user, session } = result;
  return {
    user: {
      id: user.id,
      role: (user.role as Role) ?? 'CUSTOMER',
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      isActive: user.isActive ?? true,
    },
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}
