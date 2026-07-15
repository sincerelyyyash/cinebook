import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '../infra/redis.ts';
import { RATE_LIMITS } from '../config/constants.ts';
import { Errors } from '../lib/errors.ts';

/** Resolves the identity a limit is counted against. */
type KeyResolver = (req: Request) => string | undefined;

interface RateLimitConfig {
  keyPrefix: string;
  points: number;
  durationSec: number;
  keyResolver: KeyResolver;
  /** friendly message prefix */
  message: string;
}

const byUser: KeyResolver = (req) => req.user?.id;
const byIp: KeyResolver = (req) => req.ip;
const byPhone: KeyResolver = (req) => {
  const phone = (req.body as { phone?: string; phoneNumber?: string } | undefined) ?? {};
  return phone.phone ?? phone.phoneNumber;
};

function createRateLimiter(cfg: RateLimitConfig): RequestHandler {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `rl:${cfg.keyPrefix}`,
    points: cfg.points,
    duration: cfg.durationSec,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    // Fall back to IP so anonymous callers are still bounded.
    const key = cfg.keyResolver(req) ?? byIp(req) ?? 'anonymous';
    try {
      const result = await limiter.consume(key);
      setRateHeaders(res, cfg.points, result);
      next();
    } catch (err) {
      const rlRes = err as RateLimiterRes;
      if (rlRes && typeof rlRes.msBeforeNext === 'number') {
        const retryAfterSec = Math.ceil(rlRes.msBeforeNext / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        setRateHeaders(res, cfg.points, rlRes);
        next(
          Errors.rateLimited(
            `${cfg.message} You can try again in ${retryAfterSec}s.`,
            retryAfterSec,
          ),
        );
        return;
      }
      next(err);
    }
  };
}

function setRateHeaders(res: Response, limit: number, r: RateLimiterRes): void {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, r.remainingPoints)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(r.msBeforeNext / 1000)));
}

// ── Pre-configured limiters (assignment §3.3) ───────────────
export const chatRateLimiter = createRateLimiter({
  keyPrefix: 'chat',
  points: RATE_LIMITS.chat.points,
  durationSec: RATE_LIMITS.chat.durationSec,
  keyResolver: byUser,
  message: 'Too many chat messages.',
});

export const bookingRateLimiter = createRateLimiter({
  keyPrefix: 'booking',
  points: RATE_LIMITS.booking.points,
  durationSec: RATE_LIMITS.booking.durationSec,
  keyResolver: byUser,
  message: 'Too many booking attempts.',
});

export const otpRateLimiter = createRateLimiter({
  keyPrefix: 'otp',
  points: RATE_LIMITS.otp.points,
  durationSec: RATE_LIMITS.otp.durationSec,
  keyResolver: byPhone,
  message: 'Too many verification requests for this phone number.',
});

export { createRateLimiter };
