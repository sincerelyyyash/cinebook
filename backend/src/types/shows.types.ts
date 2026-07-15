import type { Format, ScreenType, SeatCategory, ShowStatus } from '@prisma/client';

export interface ShowSummary {
  id: string;
  movieId: string;
  movieTitle: string;
  screenId: string;
  screenName: string;
  screenType: ScreenType;
  theatreId: string;
  theatreName: string;
  theatreChain: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  format: Format;
  basePrice: number; // paise
  status: ShowStatus;
}

export interface ShowDetail extends ShowSummary {
  runtimeMin: number;
  /** derived per-category ticket price (paise) */
  priceByCategory: Record<SeatCategory, number>;
}

/** Showtimes for a movie, grouped theatre → date → shows (chatbot-friendly). */
export interface ShowtimeShow {
  showId: string;
  startsAt: Date;
  endsAt: Date;
  format: Format;
  screenId: string;
  screenName: string;
  screenType: ScreenType;
  basePrice: number;
}

export interface ShowtimeDateGroup {
  date: string; // YYYY-MM-DD
  shows: ShowtimeShow[];
}

export interface ShowtimeTheatreGroup {
  theatreId: string;
  theatreName: string;
  chain: string;
  city: string;
  dates: ShowtimeDateGroup[];
}
