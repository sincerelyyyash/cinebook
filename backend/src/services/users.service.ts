import type { Prisma, Role, User } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';
import { audit } from './activity-log.service.ts';
import type { UserProfile, UserPreferences } from '../types/users.types.ts';
import type { ListUsersQuery, UpdateProfileInput } from '../validators/users.validator.ts';

function toProfile(u: User): UserProfile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role,
    isActive: u.isActive,
    preferences: (u.preferences as UserPreferences | null) ?? null,
    createdAt: u.createdAt,
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User');
  return toProfile(user);
}

/** Self profile update. Merges preferences so partial updates don't clobber. */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw Errors.notFound('User');

  const mergedPrefs: UserPreferences | undefined = input.preferences
    ? { ...((existing.preferences as UserPreferences | null) ?? {}), ...input.preferences }
    : undefined;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(mergedPrefs ? { preferences: mergedPrefs as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  return toProfile(user);
}

// ── Admin operations (§1.4 User Management) ─────────────────
export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phoneNumber: { contains: query.search } },
          ],
        }
      : {}),
  };

  const params: PaginationParams = { page: query.page, pageSize: query.pageSize };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...toPrismaSkipTake(params) }),
    prisma.user.count({ where }),
  ]);
  return paginate(rows.map(toProfile), total, params);
}

export async function getUserById(id: string): Promise<UserProfile> {
  return getProfile(id);
}

/** Admin edits a user's basic details (name/email). Email stays unique. */
export async function adminUpdateUser(
  adminId: string,
  targetId: string,
  input: { name?: string; email?: string },
): Promise<UserProfile> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw Errors.notFound('User');

  if (input.email && input.email !== target.email) {
    const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) throw Errors.conflict('That email is already in use');
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
  });
  await audit({
    action: 'user.update',
    actorId: adminId,
    target: targetId,
    metadata: { fields: Object.keys(input) },
    success: true,
  });
  return toProfile(user);
}

/** Enable/disable an account. Disabled users are blocked at `requireAuth`. */
export async function setUserActive(
  adminId: string,
  targetId: string,
  isActive: boolean,
): Promise<UserProfile> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw Errors.notFound('User');
  if (target.id === adminId && !isActive) {
    throw Errors.conflict('You cannot disable your own account');
  }

  const user = await prisma.user.update({ where: { id: targetId }, data: { isActive } });
  await audit({
    action: isActive ? 'user.enable' : 'user.disable',
    target: targetId,
    metadata: { targetPhone: target.phoneNumber },
    success: true,
  });
  return toProfile(user);
}

/** Assign a role (customer/manager/admin). */
export async function setUserRole(
  adminId: string,
  targetId: string,
  role: Role,
): Promise<UserProfile> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw Errors.notFound('User');
  if (target.id === adminId && role !== 'ADMIN') {
    throw Errors.conflict('You cannot remove your own admin role');
  }

  const user = await prisma.user.update({ where: { id: targetId }, data: { role } });
  await audit({
    action: 'user.role.assign',
    target: targetId,
    metadata: { from: target.role, to: role },
    success: true,
  });
  return toProfile(user);
}
