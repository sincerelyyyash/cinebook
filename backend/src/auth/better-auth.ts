import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { phoneNumber, bearer } from 'better-auth/plugins';
import { prisma } from '../infra/prisma.ts';
import { redis } from '../infra/redis.ts';
import { env } from '../config/env.ts';
import { childLogger } from '../lib/logger.ts';

const log = childLogger('auth');

/** Dev-only: where we stash the freshly generated OTP so the API can echo it. */
export const devOtpKey = (phone: string) => `otp:dev:${phone}`;

/**
 * Better Auth instance — the auth plumbing (phone OTP, sessions, secure tokens).
 *
 *  - `phoneNumber` plugin: passwordless OTP sign-in/up (simulated — `sendOTP`
 *    just logs, and in dev stashes the code in Redis so the API can echo it).
 *  - `bearer` plugin: issues a token clients send as `Authorization: Bearer …`,
 *    which suits the Flutter app + admin web (no cookie/CORS friction).
 *  - `role` / `isActive` are additional user fields so they ride along in the
 *    session; RBAC enforcement itself lives in our own middleware/services.
 *
 * It maps onto our hand-written Prisma models (User/Session/Account/Verification).
 */
export const auth = betterAuth({
  appName: 'CineBook',
  secret: env.JWT_ACCESS_SECRET,
  baseURL: `http://localhost:${env.PORT}`,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Phone OTP is our only sign-in method; email/password is off.
  emailAndPassword: { enabled: false },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'CUSTOMER',
        input: false, // users may never set their own role
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days ("stay logged in")
    updateAge: 60 * 60 * 24, // refresh the expiry at most once/day
  },

  plugins: [
    phoneNumber({
      otpLength: env.OTP_LENGTH,
      expiresIn: env.OTP_TTL_SECONDS,
      allowedAttempts: 3,
      // Verifying an OTP is the sign-in; unknown numbers are signed up.
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^\d]/g, '')}@phone.cinebook.local`,
        getTempName: (phone) => `Guest ${phone.slice(-4)}`,
      },
      sendOTP: async ({ phoneNumber: phone, code }) => {
        // SIMULATED delivery — no real SMS. Log it, and in dev stash it so
        // the OTP-request endpoint can echo it back for easy testing.
        log.info({ phone, code }, '📲 OTP generated (simulated SMS)');
        if (env.OTP_DEV_ECHO) {
          await redis.set(devOtpKey(phone), code, 'EX', env.OTP_TTL_SECONDS);
        }
      },
    }),
    bearer(),
  ],
});

export type Auth = typeof auth;
