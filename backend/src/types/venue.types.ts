import type { ScreenType, SeatCategory } from '@prisma/client';

export interface TheatreSummary {
  id: string;
  chain: string;
  name: string;
  city: string;
  address: string;
  location: { lat: number; lng: number } | null;
  screenCount: number;
}

export interface ScreenBrief {
  id: string;
  name: string;
  screenType: ScreenType;
  seatingCapacity: number;
}

export interface TheatreDetail extends TheatreSummary {
  screens: ScreenBrief[];
}

export interface SeatDto {
  id: string;
  row: string;
  number: number;
  category: SeatCategory;
}

export interface ScreenInfo {
  id: string;
  name: string;
  screenType: ScreenType;
  equipment: string[];
  theatre: { id: string; chain: string; name: string; city: string };
  manager: { id: string; name: string } | null;
  seatingCapacity: number;
  seatsByCategory: Record<SeatCategory, number>;
  seatMap: SeatDto[];
}
