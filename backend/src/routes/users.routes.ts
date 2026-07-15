import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { authorize } from '../middleware/authorize.ts';
import {
  updateProfileSchema,
  listUsersQuery,
  userIdParams,
  setActiveSchema,
  setRoleSchema,
  adminUpdateUserSchema,
} from '../validators/users.validator.ts';
import {
  getMyProfile,
  updateMyProfile,
  listUsersController,
  getUserController,
  setUserActiveController,
  setUserRoleController,
  adminUpdateUserController,
} from '../controllers/users.controller.ts';

export const userRoutes = Router();

// ── Self ────────────────────────────────────────────────────
userRoutes.get('/me', requireAuth, getMyProfile);
userRoutes.patch('/me', requireAuth, validate({ body: updateProfileSchema }), updateMyProfile);

// ── Admin (§1.4 User Management) ────────────────────────────
userRoutes.get('/', requireAuth, authorize('ADMIN'), validate({ query: listUsersQuery }), listUsersController);
userRoutes.get(
  '/:id',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: userIdParams }),
  getUserController,
);
userRoutes.patch(
  '/:id',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: userIdParams, body: adminUpdateUserSchema }),
  adminUpdateUserController,
);
userRoutes.patch(
  '/:id/active',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: userIdParams, body: setActiveSchema }),
  setUserActiveController,
);
userRoutes.patch(
  '/:id/role',
  requireAuth,
  authorize('ADMIN'),
  validate({ params: userIdParams, body: setRoleSchema }),
  setUserRoleController,
);
