import { z } from 'zod';

export const previewPromoSchema = z.object({
  code: z.string().trim().min(1).max(40),
  amount: z.number().int().positive(), // paise
});

export const applyPromoSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

export const createPromoSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    description: z.string().trim().min(1).max(200),
    percentOff: z.number().int().min(1).max(100).optional(),
    flatOff: z.number().int().min(1).optional(), // paise
    maxDiscount: z.number().int().min(1).optional(),
    minAmount: z.number().int().min(0).optional(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
    usageLimit: z.number().int().min(1).optional(),
  })
  .refine((v) => v.percentOff != null || v.flatOff != null, {
    message: 'Provide either percentOff or flatOff',
  })
  .refine((v) => v.validTo > v.validFrom, { message: 'validTo must be after validFrom' });

export type PreviewPromoInput = z.infer<typeof previewPromoSchema>;
export type CreatePromoInput = z.infer<typeof createPromoSchema>;
