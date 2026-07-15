import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../lib/http.ts';
import { requestOtp, verifyOtp, logout } from '../services/auth.service.ts';
import { getProfile } from '../services/users.service.ts';
import type { OtpRequestInput, OtpVerifyInput } from '../validators/auth.validator.ts';

export const requestOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body as OtpRequestInput;
  const result = await requestOtp(phone);
  ok(res, result);
});

export const verifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone, code } = req.body as OtpVerifyInput;
  const result = await verifyOtp(phone, code);
  // Client stores `token` and sends it as `Authorization: Bearer <token>`.
  ok(res, result);
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getProfile(req.user!.id);
  ok(res, profile);
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  await logout(req);
  ok(res, { message: 'Logged out' });
});
