import { z } from 'zod';
import { screenTypeEnum } from './movies.validator.ts';

export const seatCategoryEnum = z.enum(['FRONT_ROW', 'STANDARD', 'PREMIUM', 'RECLINER']);

/** One row band in a seat layout: a row label, a count, and its category. */
const layoutRowSchema = z.object({
  row: z
    .string()
    .trim()
    .regex(/^[A-Z]{1,2}$/, 'Row label must be 1–2 uppercase letters (e.g. A, AA)'),
  seats: z.number().int().min(1).max(50),
  category: seatCategoryEnum,
});

export const seatLayoutSchema = z
  .object({ rows: z.array(layoutRowSchema).min(1).max(40) })
  .refine((v) => new Set(v.rows.map((r) => r.row)).size === v.rows.length, {
    message: 'Row labels must be unique',
  });

export const screenIdParams = z.object({ id: z.string().min(1) });
export const theatreIdParams = z.object({ theatreId: z.string().min(1) });

export const createScreenSchema = z.object({
  theatreId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  screenType: screenTypeEnum,
  equipment: z.array(z.string().trim().min(1)).max(20).default([]),
  managerId: z.string().min(1).optional(),
  layout: seatLayoutSchema,
});

export const updateScreenSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  screenType: screenTypeEnum.optional(),
  equipment: z.array(z.string().trim().min(1)).max(20).optional(),
  managerId: z.string().min(1).nullable().optional(), // null = unassign
});

export type SeatLayout = z.infer<typeof seatLayoutSchema>;
export type CreateScreenInput = z.infer<typeof createScreenSchema>;
export type UpdateScreenInput = z.infer<typeof updateScreenSchema>;
