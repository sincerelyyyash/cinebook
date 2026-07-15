import type { Prisma } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { getContext } from '../lib/async-context.ts';
import { childLogger } from '../lib/logger.ts';
import { paginate, toPrismaSkipTake, type PaginationParams } from '../lib/pagination.ts';

const log = childLogger('activity-log');

export interface AuditInput {
  action: string; // e.g. "user.disable", "show.create", "chatbot.tool.hold_seats"
  actorId?: string;
  actorRole?: string;
  target?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  durationMs?: number;
}

/**
 * Records an auditable action (§3.1 Activity Log). Best-effort: a logging
 * failure must never break the underlying operation. Trace id + actor are
 * pulled from the request context when not supplied.
 */
export async function audit(input: AuditInput): Promise<void> {
  const ctx = getContext();
  try {
    await prisma.activityLog.create({
      data: {
        traceId: ctx?.traceId,
        actorId: input.actorId ?? ctx?.userId,
        actorRole: input.actorRole ?? ctx?.userRole,
        action: input.action,
        target: input.target,
        metadata: (input.metadata ?? undefined) as object | undefined,
        success: input.success,
        durationMs: input.durationMs,
      },
    });
  } catch (err) {
    log.error({ err: (err as Error).message, action: input.action }, 'failed to write activity log');
  }
}

export interface ActivityQuery extends PaginationParams {
  actorId?: string;
  action?: string; // prefix match, e.g. "booking." or exact "show.create"
  success?: boolean;
  from?: Date;
  to?: Date;
}

/** Query the audit trail (§1.4 Activity Log / §3.1). Admin only. */
export async function queryActivity(q: ActivityQuery) {
  const where: Prisma.ActivityLogWhereInput = {
    ...(q.actorId ? { actorId: q.actorId } : {}),
    ...(q.action ? { action: { startsWith: q.action } } : {}),
    ...(q.success !== undefined ? { success: q.success } : {}),
    ...(q.from || q.to
      ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
      : {}),
  };
  const params: PaginationParams = { page: q.page, pageSize: q.pageSize };
  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true } } },
      ...toPrismaSkipTake(params),
    }),
    prisma.activityLog.count({ where }),
  ]);
  const data = rows.map((r) => ({
    id: r.id,
    traceId: r.traceId,
    actorId: r.actorId,
    actorName: r.actor?.name ?? null,
    actorRole: r.actorRole,
    action: r.action,
    target: r.target,
    metadata: r.metadata,
    success: r.success,
    durationMs: r.durationMs,
    createdAt: r.createdAt,
  }));
  return paginate(data, total, params);
}

/** Wrap an async action, recording its outcome + duration to the audit log. */
export async function withAudit<T>(
  action: string,
  meta: Omit<AuditInput, 'action' | 'success' | 'durationMs'>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    await audit({ ...meta, action, success: true, durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (err) {
    await audit({
      ...meta,
      action,
      success: false,
      durationMs: Math.round(performance.now() - start),
      metadata: { ...meta.metadata, error: (err as Error).message },
    });
    throw err;
  }
}
