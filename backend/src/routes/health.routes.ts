import { Router } from 'express';
import { liveness, readiness } from '../controllers/health.controller.ts';

export const healthRoutes = Router();

healthRoutes.get('/live', liveness);
healthRoutes.get('/ready', readiness);
