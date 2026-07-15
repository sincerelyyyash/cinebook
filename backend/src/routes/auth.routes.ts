import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { otpRateLimiter } from '../middleware/rate-limit.ts';
import { otpRequestSchema, otpVerifySchema } from '../validators/auth.validator.ts';
import {
  requestOtpController,
  verifyOtpController,
  meController,
  logoutController,
} from '../controllers/auth.controller.ts';

export const authRoutes = Router();

// OTP request is rate-limited to 5/hour/phone (§3.3).
authRoutes.post(
  '/otp/request',
  otpRateLimiter,
  validate({ body: otpRequestSchema }),
  requestOtpController,
);
authRoutes.post('/otp/verify', validate({ body: otpVerifySchema }), verifyOtpController);

authRoutes.get('/me', requireAuth, meController);
authRoutes.post('/logout', requireAuth, logoutController);
