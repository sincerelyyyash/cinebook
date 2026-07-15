import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.ts';

/** Reusable pagination query schema — merge into feature list validators. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationParams = z.infer<typeof paginationQuery>;

export function toPrismaSkipTake(p: PaginationParams) {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function paginate<T>(data: T[], total: number, p: PaginationParams): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / p.pageSize));
  return {
    data,
    pagination: {
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages,
      hasMore: p.page < totalPages,
    },
  };
}
