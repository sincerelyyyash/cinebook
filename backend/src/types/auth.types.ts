import type { Role } from '@prisma/client';

/** The authenticated principal attached to `req.user` after `authenticate`. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
}

/** Session info resolved from Better Auth (Phase 1 wires the real resolver). */
export interface ResolvedSession {
  user: AuthUser;
  sessionId: string;
  expiresAt: Date;
}
