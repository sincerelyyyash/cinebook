import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, devOtpKey } from '../auth/better-auth.ts';
import { prisma } from '../infra/prisma.ts';
import { redis } from '../infra/redis.ts';
import { env } from '../config/env.ts';
import { Errors } from '../lib/errors.ts';
import { childLogger } from '../lib/logger.ts';
import type { AuthUser } from '../types/auth.types.ts';

const log = childLogger('auth.service');

export interface OtpRequestResult {
  message: string;
  /** Only populated in dev (OTP_DEV_ECHO) to make testing painless. */
  devCode?: string;
}

export interface VerifyResult {
  token: string;
  user: AuthUser;
}

/**
 * Request an OTP for a phone number. Delegates code generation + "delivery" to
 * Better Auth's phone plugin (simulated). In dev we echo the code back so the
 * flow is testable without SMS.
 */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone } });

  const result: OtpRequestResult = { message: 'Verification code sent' };
  if (env.OTP_DEV_ECHO) {
    const code = await redis.get(devOtpKey(phone));
    if (code) result.devCode = code;
  }
  return result;
}

/**
 * Verify an OTP. On success Better Auth signs the user in (creating the account
 * if new) and the bearer plugin returns a session token via the `set-auth-token`
 * header. We additionally enforce our own `isActive` gate.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  let headers: Headers;
  try {
    const res = await auth.api.verifyPhoneNumber({
      body: { phoneNumber: phone, code },
      returnHeaders: true,
    });
    headers = res.headers;
    if (!res.response) throw Errors.unauthorized('Invalid or expired verification code');
  } catch (err) {
    log.warn({ phone, err: (err as Error).message }, 'otp verification failed');
    throw Errors.unauthorized('Invalid or expired verification code');
  }

  const token = headers.get('set-auth-token');
  if (!token) throw Errors.internal('Failed to issue session token');

  // Load the full domain user (role/isActive live on our model).
  const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  if (!user) throw Errors.internal('User not found after verification');

  if (!user.isActive) {
    throw Errors.forbidden('Your account has been disabled. Contact support.');
  }

  return { token, user: toAuthUser(user) };
}

/** Revoke the current session. */
export async function logout(req: Request): Promise<void> {
  await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
}

function toAuthUser(u: {
  id: string;
  role: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
}): AuthUser {
  return {
    id: u.id,
    role: u.role as AuthUser['role'],
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber,
    isActive: u.isActive,
  };
}
