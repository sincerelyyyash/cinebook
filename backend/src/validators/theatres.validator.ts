import { z } from 'zod';
import { paginationQuery } from '../lib/pagination.ts';

export const listTheatresQuery = paginationQuery.extend({
  chain: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const theatreIdParams = z.object({ id: z.string().min(1) });

export const createTheatreSchema = z.object({
  chain: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(300),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const updateTheatreSchema = createTheatreSchema.partial();

export type ListTheatresQuery = z.infer<typeof listTheatresQuery>;
export type CreateTheatreInput = z.infer<typeof createTheatreSchema>;
export type UpdateTheatreInput = z.infer<typeof updateTheatreSchema>;
