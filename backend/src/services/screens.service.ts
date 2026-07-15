import type { Prisma, SeatCategory } from '@prisma/client';
import { prisma } from '../infra/prisma.ts';
import { Errors } from '../lib/errors.ts';
import { audit } from './activity-log.service.ts';
import type { ScreenInfo, SeatDto } from '../types/venue.types.ts';
import type {
  CreateScreenInput,
  SeatLayout,
  UpdateScreenInput,
} from '../validators/screens.validator.ts';

const EMPTY_CATEGORY_COUNTS: Record<SeatCategory, number> = {
  FRONT_ROW: 0,
  STANDARD: 0,
  PREMIUM: 0,
  RECLINER: 0,
};

/**
 * Seat-layout generator: expands a compact layout spec (row bands) into
 * concrete seat rows. e.g. { row:'A', seats:12, category:'FRONT_ROW' } →
 * A1..A12. Returns the flat seat list ready for bulk insert.
 */
export function generateSeats(layout: SeatLayout): Array<Omit<SeatDto, 'id'>> {
  const seats: Array<Omit<SeatDto, 'id'>> = [];
  for (const band of layout.rows) {
    for (let n = 1; n <= band.seats; n++) {
      seats.push({ row: band.row, number: n, category: band.category });
    }
  }
  return seats;
}

async function loadScreenInfo(id: string): Promise<ScreenInfo> {
  const screen = await prisma.screen.findUnique({
    where: { id },
    include: {
      theatre: true,
      manager: { select: { id: true, name: true } },
      seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
    },
  });
  if (!screen) throw Errors.notFound('Screen');

  const seatsByCategory = { ...EMPTY_CATEGORY_COUNTS };
  for (const s of screen.seats) seatsByCategory[s.category]++;

  return {
    id: screen.id,
    name: screen.name,
    screenType: screen.screenType,
    equipment: (screen.equipment as string[]) ?? [],
    theatre: {
      id: screen.theatre.id,
      chain: screen.theatre.chain,
      name: screen.theatre.name,
      city: screen.theatre.city,
    },
    manager: screen.manager ? { id: screen.manager.id, name: screen.manager.name } : null,
    seatingCapacity: screen.seats.length,
    seatsByCategory,
    seatMap: screen.seats.map((s) => ({ id: s.id, row: s.row, number: s.number, category: s.category })),
  };
}

export async function getScreenInfo(id: string): Promise<ScreenInfo> {
  return loadScreenInfo(id);
}

export async function listScreensByTheatre(theatreId: string) {
  const theatre = await prisma.theatre.findUnique({ where: { id: theatreId }, select: { id: true } });
  if (!theatre) throw Errors.notFound('Theatre');
  const screens = await prisma.screen.findMany({
    where: { theatreId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { seats: true } } },
  });
  return screens.map((s) => ({
    id: s.id,
    name: s.name,
    screenType: s.screenType,
    seatingCapacity: s._count.seats,
  }));
}

async function assertValidManager(managerId: string): Promise<void> {
  const manager = await prisma.user.findUnique({ where: { id: managerId }, select: { role: true } });
  if (!manager) throw Errors.notFound('Manager');
  if (manager.role !== 'HALL_MANAGER') {
    throw Errors.validation('Assigned user must have the HALL_MANAGER role');
  }
}

/**
 * Create a screen and generate its seat map atomically (§1.4 Screen
 * Configuration). Seat layout + equipment come in the same request.
 */
export async function createScreen(input: CreateScreenInput): Promise<ScreenInfo> {
  const theatre = await prisma.theatre.findUnique({ where: { id: input.theatreId }, select: { id: true } });
  if (!theatre) throw Errors.notFound('Theatre');
  if (input.managerId) await assertValidManager(input.managerId);

  const seats = generateSeats(input.layout);

  const screen = await prisma.screen.create({
    data: {
      theatreId: input.theatreId,
      name: input.name,
      screenType: input.screenType,
      equipment: input.equipment as unknown as Prisma.InputJsonValue,
      managerId: input.managerId,
      seats: { create: seats.map((s) => ({ row: s.row, number: s.number, category: s.category })) },
    },
  });

  await audit({
    action: 'screen.create',
    target: screen.id,
    metadata: { name: screen.name, seatCount: seats.length, theatreId: input.theatreId },
    success: true,
  });
  return loadScreenInfo(screen.id);
}

export async function updateScreen(id: string, input: UpdateScreenInput): Promise<ScreenInfo> {
  const existing = await prisma.screen.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw Errors.notFound('Screen');
  if (input.managerId) await assertValidManager(input.managerId);

  await prisma.screen.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.screenType !== undefined ? { screenType: input.screenType } : {}),
      ...(input.equipment !== undefined
        ? { equipment: input.equipment as unknown as Prisma.InputJsonValue }
        : {}),
      // managerId: null unassigns; undefined leaves unchanged
      ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
    },
  });

  await audit({ action: 'screen.update', target: id, metadata: { fields: Object.keys(input) }, success: true });
  return loadScreenInfo(id);
}
