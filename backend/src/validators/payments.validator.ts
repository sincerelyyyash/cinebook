import { z } from 'zod';

export const paymentParams = z.object({ bookingId: z.string().min(1) });

const cardNumber = z
  .string()
  .trim()
  .refine((s) => {
    const digits = s.replace(/\D/g, '');
    return digits.length >= 12 && digits.length <= 19;
  }, 'Enter a valid card number');

export const confirmPaymentSchema = z.object({ cardNumber });

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
