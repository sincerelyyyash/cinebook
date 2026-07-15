import type { Request, Response } from 'express';
import { checkHealth } from '../services/health.service.ts';
import { asyncHandler } from '../lib/http.ts';

/** Liveness — always 200 if the process can respond. */
export const liveness = (_req: Request, res: Response): void => {
  res.status(200).json({ data: { status: 'alive' } });
};

/** Readiness — 200 only when DB + Redis are reachable, else 503. */
export const readiness = asyncHandler(async (_req: Request, res: Response) => {
  const report = await checkHealth();
  res.status(report.status === 'ok' ? 200 : 503).json({ data: report });
});
