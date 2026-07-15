import { z } from 'zod';

export const createGenreSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export type CreateGenreInput = z.infer<typeof createGenreSchema>;
