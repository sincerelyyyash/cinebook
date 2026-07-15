import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().min(1).optional(),
  stream: z.boolean().optional().default(true),
});

export const conversationIdParams = z.object({ id: z.string().min(1) });

export type ChatInput = z.infer<typeof chatSchema>;
