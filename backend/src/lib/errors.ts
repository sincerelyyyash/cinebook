/**
 * Typed application errors. Services throw these; the error-handler middleware
 * is the single place that translates them into HTTP responses. Every error
 * carries a stable machine-readable `code` (useful for the frontend and the
 * chatbot, which surfaces rule violations conversationally).
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SHOW_RULE_VIOLATION'
  | 'SEAT_UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_UNAVAILABLE'
  | 'PROMO_INVALID'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  /** machine-readable domain code */
  code: ErrorCode;
  /** HTTP status */
  status: number;
  /** human-readable message (safe to show clients) */
  message: string;
  /** structured extra context (safe to expose) */
  details?: unknown;
  /** underlying cause (logged, never sent to client) */
  cause?: unknown;
  /** whether this failure class is safe to retry */
  retryable?: boolean;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryable: boolean;

  constructor(opts: AppErrorOptions) {
    super(opts.message, { cause: opts.cause });
    this.name = 'AppError';
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.retryable = opts.retryable ?? false;
  }

  toJSON() {
    return {
      error: { code: this.code, message: this.message, details: this.details },
    };
  }
}

// ── Ergonomic factories ─────────────────────────────────────
export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError({ code: 'VALIDATION_ERROR', status: 400, message, details }),

  unauthorized: (message = 'Authentication required') =>
    new AppError({ code: 'UNAUTHORIZED', status: 401, message }),

  forbidden: (message = 'You do not have access to this resource') =>
    new AppError({ code: 'FORBIDDEN', status: 403, message }),

  notFound: (resource = 'Resource') =>
    new AppError({ code: 'NOT_FOUND', status: 404, message: `${resource} not found` }),

  conflict: (message: string, details?: unknown) =>
    new AppError({ code: 'CONFLICT', status: 409, message, details }),

  rateLimited: (message: string, retryAfterSec: number) =>
    new AppError({
      code: 'RATE_LIMITED',
      status: 429,
      message,
      details: { retryAfterSec },
    }),

  showRule: (message: string, details?: unknown) =>
    new AppError({ code: 'SHOW_RULE_VIOLATION', status: 422, message, details }),

  seatUnavailable: (message = 'One or more selected seats are no longer available', details?: unknown) =>
    new AppError({ code: 'SEAT_UNAVAILABLE', status: 409, message, details }),

  holdExpired: (message = 'Your seat hold has expired. Please select seats again.') =>
    new AppError({ code: 'HOLD_EXPIRED', status: 410, message }),

  paymentFailed: (message: string, details?: unknown) =>
    new AppError({ code: 'PAYMENT_FAILED', status: 402, message, details }),

  paymentUnavailable: (message = 'Payments are temporarily unavailable. Please try again shortly.') =>
    new AppError({ code: 'PAYMENT_UNAVAILABLE', status: 503, message, retryable: true }),

  promoInvalid: (message: string, details?: unknown) =>
    new AppError({ code: 'PROMO_INVALID', status: 422, message, details }),

  upstream: (message: string, cause?: unknown) =>
    new AppError({ code: 'UPSTREAM_ERROR', status: 502, message, cause, retryable: true }),

  internal: (message = 'Something went wrong', cause?: unknown) =>
    new AppError({ code: 'INTERNAL_ERROR', status: 500, message, cause }),
};

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
