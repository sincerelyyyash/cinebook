import { z } from 'zod';
import type { Tool } from './registry.ts';
import { startPayment, confirmPayment } from '../../services/payments.service.ts';
import { applyPromoToBooking, previewPromo } from '../../services/promos.service.ts';

export const paymentTools: Tool[] = [
  {
    name: 'apply_promo',
    description: 'Apply a promo/discount code to a PENDING booking, recomputing its total.',
    schema: z.object({ bookingId: z.string(), code: z.string() }),
    handler: (ctx, i) => applyPromoToBooking(ctx.userId, i.bookingId, i.code),
  },
  {
    name: 'preview_promo',
    description: 'Check how much a promo code would save on an amount (paise) before applying it.',
    schema: z.object({ code: z.string(), amount: z.number().int().positive() }),
    handler: (_ctx, i) => previewPromo(i.code, i.amount),
  },
  {
    name: 'start_payment',
    description: 'Begin checkout for a booking — creates the payment intent. Call before confirm_payment.',
    schema: z.object({ bookingId: z.string() }),
    handler: (ctx, i) => startPayment(ctx.userId, i.bookingId),
  },
  {
    name: 'confirm_payment',
    description:
      'Complete checkout by charging a card. On success the booking is confirmed. Test cards: 4111111111111111 succeeds, 4000000000000002 is declined.',
    schema: z.object({ bookingId: z.string(), cardNumber: z.string() }),
    handler: (ctx, i) => confirmPayment(ctx.userId, i.bookingId, i.cardNumber),
  },
];
