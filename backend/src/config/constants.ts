import type { SeatCategory } from '@prisma/client';

/**
 * Central home for business-rule constants referenced across modules.
 * Keeping them here (not scattered as magic numbers) makes the rules auditable.
 */

// ── Seat holds ──────────────────────────────────────────────
export const SEAT_HOLD_TTL_SECONDS = 5 * 60; // 5-minute hold (assignment §1.2)
export const SEAT_HOLD_TTL_MS = SEAT_HOLD_TTL_SECONDS * 1000;
export const MAX_SEATS_PER_HOLD = 10;

// ── Show scheduling (assignment §1.3) ───────────────────────
export const SHOW_CLEANING_GAP_MINUTES = 30; // min gap between shows on a screen
export const SHOW_MAX_ADVANCE_DAYS = 30; // can't schedule further than this ahead

// ── Seat pricing: multiplier applied to Show.basePrice per category ──
export const SEAT_CATEGORY_MULTIPLIER: Record<SeatCategory, number> = {
  FRONT_ROW: 0.8,
  STANDARD: 1.0,
  PREMIUM: 1.4,
  RECLINER: 1.8,
};

// ── Rate limits (assignment §3.3) ───────────────────────────
export const RATE_LIMITS = {
  chat: { points: 30, durationSec: 60 }, // 30 messages / minute / user
  booking: { points: 5, durationSec: 60 * 60 }, // 5 attempts / hour / user
  otp: { points: 5, durationSec: 60 * 60 }, // 5 requests / hour / phone
} as const;

// ── Resilience ──────────────────────────────────────────────
export const RETRY_DEFAULTS = {
  retries: 3,
  baseDelayMs: 200,
  maxDelayMs: 3000,
  factor: 2,
};

export const PAYMENT_CIRCUIT_BREAKER = {
  failureThreshold: 5, // consecutive failures before opening
  cooldownMs: 30_000, // stay open this long, then half-open
  halfOpenMaxCalls: 1,
};

// ── Chatbot ─────────────────────────────────────────────────
export const CHAT_MAX_TOOL_ITERATIONS = 12; // safety bound on the agent loop
export const CHAT_CONTEXT_TOKEN_BUDGET = 12_000; // trigger compaction beyond this (est.)
export const CHAT_RECENT_TURNS_KEPT = 12; // verbatim turns retained after compaction

// ── Misc ────────────────────────────────────────────────────
export const BOOKING_CODE_PREFIX = 'CB';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
