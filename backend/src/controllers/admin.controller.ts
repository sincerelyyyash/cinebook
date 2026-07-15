import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../lib/http.ts';
import {
  getSummary,
  getRevenueTimeseries,
  getTopMovies,
  getTopTheatres,
} from '../services/reports.service.ts';
import { queryActivity } from '../services/activity-log.service.ts';
import type { ActivityQueryInput, RevenueQuery, TopQuery } from '../validators/admin.validator.ts';

export const summaryController = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as unknown as { from?: Date; to?: Date };
  ok(res, await getSummary({ from, to }));
});

export const revenueController = asyncHandler(async (req: Request, res: Response) => {
  const { granularity, from, to } = req.query as unknown as RevenueQuery;
  ok(res, { granularity, points: await getRevenueTimeseries(granularity, { from, to }) });
});

export const topMoviesController = asyncHandler(async (req: Request, res: Response) => {
  const { limit, from, to } = req.query as unknown as TopQuery;
  ok(res, await getTopMovies(limit, { from, to }));
});

export const topTheatresController = asyncHandler(async (req: Request, res: Response) => {
  const { limit, from, to } = req.query as unknown as TopQuery;
  ok(res, await getTopTheatres(limit, { from, to }));
});

export const activityController = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await queryActivity(req.query as unknown as ActivityQueryInput));
});
