import type { Role } from '@prisma/client';

/** User preferences — feeds the chatbot's personalization/memory later. */
export interface UserPreferences {
  languages?: string[];
  genres?: string[];
  seatCategory?: 'FRONT_ROW' | 'STANDARD' | 'PREMIUM' | 'RECLINER';
  city?: string;
}

/** Safe user projection returned by the API (no auth internals). */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  isActive: boolean;
  preferences: UserPreferences | null;
  createdAt: Date;
}
