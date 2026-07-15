import type { Tool } from './registry.ts';
import { movieTools } from './movie.tools.ts';
import { bookingTools } from './booking.tools.ts';
import { paymentTools } from './payment.tools.ts';
import { profileTools } from './profile.tools.ts';

/** Everything the orchestrator can do (minus delegate_booking, added there). */
export const allTools: Tool[] = [...movieTools, ...bookingTools, ...paymentTools, ...profileTools];

/** The focused subset the booking sub-agent uses (discovery + hold only). */
export const bookingAgentTools: Tool[] = [
  ...movieTools.filter((t) => ['search_movies', 'get_movie_details', 'get_showtimes'].includes(t.name)),
  ...bookingTools.filter((t) =>
    ['find_theatres', 'check_seat_availability', 'hold_seats', 'get_screen_info'].includes(t.name),
  ),
];
