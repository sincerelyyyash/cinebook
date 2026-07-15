import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';

export const seatCategoryEnum = z.enum(['FRONT_ROW', 'STANDARD', 'PREMIUM', 'RECLINER']);
export const roleEnum = z.enum(['CUSTOMER', 'HALL_MANAGER', 'ADMIN']);

export const preferencesSchema = z
  .object({
    languages: z.array(z.string().trim().min(1)).max(20).optional(),
    genres: z.array(z.string().trim().min(1)).max(20).optional(),
    seatCategory: seatCategoryEnum.optional(),
    city: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

/** Self profile update (customer editing their own profile). */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    preferences: preferencesSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.preferences !== undefined, {
    message: 'Provide at least one field to update',
  });

// ── Admin ───────────────────────────────────────────────────
export const listUsersQuery = paginationQuery.extend({
  role: roleEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

export const userIdParams = z.object({ id: z.string().min(1) });

export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, {
    message: 'Provide at least one field to update',
  });

export const setActiveSchema = z.object({ isActive: z.boolean() });

export const setRoleSchema = z.object({ role: roleEnum });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type SetActiveInput = z.infer<typeof setActiveSchema>;
export type SetRoleInput = z.infer<typeof setRoleSchema>;
