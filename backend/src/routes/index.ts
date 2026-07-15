import { Router } from 'express';
import { healthRoutes } from './health.routes.ts';
import { authRoutes } from './auth.routes.ts';
import { userRoutes } from './users.routes.ts';
import { genreRoutes } from './genres.routes.ts';
import { movieRoutes } from './movies.routes.ts';
import { theatreRoutes } from './theatres.routes.ts';
import { screenRoutes } from './screens.routes.ts';
import { showRoutes } from './shows.routes.ts';
import { bookingRoutes } from './bookings.routes.ts';
import { paymentRoutes } from './payments.routes.ts';
import { promoRoutes } from './promos.routes.ts';
import { adminRoutes } from './admin.routes.ts';
import { chatbotRoutes } from './chatbot.routes.ts';

/**
 * Aggregates every feature router. Mounted under `/api` in app.ts.
 * As phases land, add: showRoutes, bookingRoutes, paymentRoutes,
 * adminRoutes, chatRoutes, …
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/genres', genreRoutes);
apiRouter.use('/movies', movieRoutes);
apiRouter.use('/theatres', theatreRoutes);
apiRouter.use('/screens', screenRoutes);
apiRouter.use('/shows', showRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/promos', promoRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/chat', chatbotRoutes);

export default apiRouter;
