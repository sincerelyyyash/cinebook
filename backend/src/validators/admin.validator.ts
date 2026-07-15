import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';

const dateRange = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const reportRangeQuery = z.object({ ...dateRange });

export const revenueQuery = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  ...dateRange,
});

export const topQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  ...dateRange,
});

export const activityQuery = paginationQuery.extend({
  actorId: z.string().min(1).optional(),
  action: z.string().trim().min(1).max(60).optional(),
  success: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  ...dateRange,
});

export type RevenueQuery = z.infer<typeof revenueQuery>;
export type TopQuery = z.infer<typeof topQuery>;
export type ActivityQueryInput = z.infer<typeof activityQuery>;
