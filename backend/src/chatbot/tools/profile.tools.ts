import { z } from 'zod';
import type { Tool } from './registry.ts';
import { getProfile, updateProfile } from '../../services/users.service.ts';
import { listActivePromos } from '../../services/promos.service.ts';
import { getTrending, listMovies } from '../../services/movies.service.ts';
import { audit } from '../../services/activity-log.service.ts';

const seatCategory = z.enum(['FRONT_ROW', 'STANDARD', 'PREMIUM', 'RECLINER']);

export const profileTools: Tool[] = [
  {
    name: 'get_profile',
    description: "The customer's profile and saved preferences.",
    schema: z.object({}),
    handler: (ctx) => getProfile(ctx.userId),
  },
  {
    name: 'update_preferences',
    description:
      'Save the customer preferences so future recommendations improve (favourite genres, languages, preferred seat category, city).',
    schema: z.object({
      genres: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
      seatCategory: seatCategory.optional(),
      city: z.string().optional(),
    }),
    handler: (ctx, i) => updateProfile(ctx.userId, { preferences: i }),
  },
  {
    name: 'get_recommendations',
    description: 'Personalized movie recommendations based on saved preferences (falls back to trending).',
    schema: z.object({}),
    handler: async (ctx) => {
      const profile = await getProfile(ctx.userId);
      const prefs = profile.preferences;
      const genre = prefs?.genres?.[0];
      if (genre) {
        const byGenre = await listMovies({ page: 1, pageSize: 8, sort: 'releaseDate', order: 'desc', genre });
        if (byGenre.data.length) return { basis: `genre:${genre}`, movies: byGenre.data };
      }
      return { basis: 'trending', movies: await getTrending(8) };
    },
  },
  {
    name: 'get_offers',
    description: 'Current promo codes / offers the customer could use.',
    schema: z.object({}),
    handler: () => listActivePromos(),
  },
  {
    name: 'contact_support',
    description: 'Raise a support request on the customer’s behalf (logged for follow-up).',
    schema: z.object({ message: z.string().min(1) }),
    handler: async (ctx, i) => {
      await audit({ action: 'chatbot.support_request', actorId: ctx.userId, metadata: { message: i.message }, success: true });
      return {
        acknowledged: true,
        message: "I've logged your request with our support team — they'll follow up shortly. Is there anything else I can help with?",
      };
    },
  },
];
