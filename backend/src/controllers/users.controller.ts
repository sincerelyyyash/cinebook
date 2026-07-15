import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../lib/http.ts';
import {
  getProfile,
  updateProfile,
  listUsers,
  getUserById,
  setUserActive,
  setUserRole,
  adminUpdateUser,
} from '../services/users.service.ts';
import type {
  ListUsersQuery,
  SetActiveInput,
  SetRoleInput,
  UpdateProfileInput,
  AdminUpdateUserInput,
} from '../validators/users.validator.ts';

// ── Self (any authenticated user) ───────────────────────────
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getProfile(req.user!.id));
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await updateProfile(req.user!.id, req.body as UpdateProfileInput));
});

// ── Admin ───────────────────────────────────────────────────
export const listUsersController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listUsers(req.query as unknown as ListUsersQuery));
});

export const getUserController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await getUserById(req.params.id!));
});

export const adminUpdateUserController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminUpdateUser(req.user!.id, req.params.id!, req.body as AdminUpdateUserInput));
});

export const setUserActiveController = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as SetActiveInput;
  ok(res, await setUserActive(req.user!.id, req.params.id!, isActive));
});

export const setUserRoleController = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as SetRoleInput;
  ok(res, await setUserRole(req.user!.id, req.params.id!, role));
});
