import type { AgeRating } from '@prisma/client';

export interface CastMember {
  name: string;
  role: string; // character or "Director", "Music", etc.
  photoUrl?: string;
}

export interface MovieSummary {
  id: string;
  title: string;
  runtimeMin: number;
  releaseDate: Date;
  language: string;
  ageRating: AgeRating;
  posterUrl: string | null;
  genres: string[];
  isTrending: boolean;
  rating: { average: number; count: number };
}

export interface MovieDetail extends MovieSummary {
  description: string;
  trailerUrl: string | null;
  cast: CastMember[];
}
