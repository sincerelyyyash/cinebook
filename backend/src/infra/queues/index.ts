import { Queue, type QueueOptions } from 'bullmq';
import { bullConnection } from '../redis.ts';
import { RETRY_DEFAULTS } from '../../config/constants.ts';

/**
 * Central registry of BullMQ queues. Queues are created in BOTH the API
 * process (to enqueue jobs) and the worker process (to process them); the
 * worker attaches processors separately in `src/worker.ts`.
 */
export const QUEUE_NAMES = {
  seatHold: 'seat-hold',
  notifications: 'notifications',
  reports: 'reports',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const baseQueueOptions: QueueOptions = {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: RETRY_DEFAULTS.retries,
    backoff: { type: 'exponential', delay: RETRY_DEFAULTS.baseDelayMs },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

// ── Queue instances ─────────────────────────────────────────

/** Delayed job releases an expired 5-minute seat hold. */
export const seatHoldQueue = new Queue(QUEUE_NAMES.seatHold, baseQueueOptions);

/** Fire-and-forget user notifications (booking confirmations, etc.). */
export const notificationsQueue = new Queue(QUEUE_NAMES.notifications, baseQueueOptions);

/** Periodic revenue/booking report aggregation. */
export const reportsQueue = new Queue(QUEUE_NAMES.reports, baseQueueOptions);

export const allQueues = [seatHoldQueue, notificationsQueue, reportsQueue];

export async function closeQueues(): Promise<void> {
  await Promise.allSettled(allQueues.map((q) => q.close()));
}

// ── Job payload types (shared by producers + workers) ───────
export interface SeatHoldExpiryJob {
  holdId: string;
  showId: string;
  seatIds: string[];
  userId: string;
}

export interface NotificationJob {
  userId: string;
  kind: 'booking_confirmed' | 'booking_cancelled' | 'refund_processed';
  bookingId: string;
}
