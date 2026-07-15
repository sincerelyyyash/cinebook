import type { BookingStatus, Format, SeatCategory } from '@prisma/client';

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface SeatAvailability {
  id: string;
  row: string;
  number: number;
  category: SeatCategory;
  price: number; // paise
  status: SeatStatus;
  heldByMe: boolean;
}

export interface ShowAvailability {
  showId: string;
  movieTitle: string;
  screenName: string;
  theatreName: string;
  startsAt: Date;
  format: Format;
  priceByCategory: Record<SeatCategory, number>;
  summary: { total: number; available: number; held: number; booked: number };
  seats: SeatAvailability[];
}

export interface HoldSeatLine {
  seatId: string;
  label: string; // e.g. "J5"
  category: SeatCategory;
  price: number;
}

export interface HoldDto {
  id: string;
  showId: string;
  seats: HoldSeatLine[];
  subtotal: number;
  expiresAt: Date;
  ttlSeconds: number;
}

export interface BookingSeatLine {
  seatId: string;
  label: string;
  category: SeatCategory;
  price: number;
}

export interface BookingDto {
  id: string;
  code: string;
  status: BookingStatus;
  show: {
    id: string;
    movieTitle: string;
    screenName: string;
    theatreName: string;
    city: string;
    startsAt: Date;
    format: Format;
  };
  seats: BookingSeatLine[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  payment: { status: string; transactionId: string } | null;
}
