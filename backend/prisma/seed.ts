import {
  PrismaClient,
  type Role,
  type AgeRating,
  type ScreenType,
  type SeatCategory,
  type Format,
} from '@prisma/client';
import { POSTER_BY_TITLE } from './movie-posters.ts';

const prisma = new PrismaClient();

// ── helpers ─────────────────────────────────────────────────
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

interface LayoutRow {
  row: string;
  seats: number;
  category: SeatCategory;
}

/** Standard cinema layout: budget front → recliner back. */
function standardLayout(seatsPerRow = 14): LayoutRow[] {
  return [
    { row: 'A', seats: seatsPerRow, category: 'FRONT_ROW' },
    { row: 'B', seats: seatsPerRow, category: 'FRONT_ROW' },
    { row: 'C', seats: seatsPerRow, category: 'STANDARD' },
    { row: 'D', seats: seatsPerRow, category: 'STANDARD' },
    { row: 'E', seats: seatsPerRow, category: 'STANDARD' },
    { row: 'F', seats: seatsPerRow, category: 'STANDARD' },
    { row: 'G', seats: seatsPerRow, category: 'PREMIUM' },
    { row: 'H', seats: seatsPerRow, category: 'PREMIUM' },
    { row: 'J', seats: Math.max(6, seatsPerRow - 4), category: 'RECLINER' },
    { row: 'K', seats: Math.max(6, seatsPerRow - 4), category: 'RECLINER' },
  ];
}

function expandSeats(layout: LayoutRow[]) {
  const seats: Array<{ row: string; number: number; category: SeatCategory }> = [];
  for (const band of layout) {
    for (let n = 1; n <= band.seats; n++) seats.push({ row: band.row, number: n, category: band.category });
  }
  return seats;
}

// ── data ────────────────────────────────────────────────────
const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
  'Thriller', 'Romance', 'Animation', 'Adventure', 'Documentary',
];

const DEMO_USERS: Array<{ phone: string; name: string; email: string; role: Role }> = [
  { phone: '+919000000001', name: 'Aria Admin', email: 'admin@cinebook.dev', role: 'ADMIN' },
  { phone: '+919000000002', name: 'Mano Manager', email: 'manager@cinebook.dev', role: 'HALL_MANAGER' },
  { phone: '+919000000003', name: 'Cira Customer', email: 'customer@cinebook.dev', role: 'CUSTOMER' },
];

interface MovieSeed {
  title: string;
  description: string;
  runtimeMin: number;
  releaseDate: Date;
  language: string;
  ageRating: AgeRating;
  genres: string[];
  cast: Array<{ name: string; role: string }>;
  isTrending?: boolean;
}

const MOVIES: MovieSeed[] = [
  {
    title: 'Inception', runtimeMin: 148, language: 'English', ageRating: 'UA', isTrending: true,
    releaseDate: daysFromNow(-40), genres: ['Sci-Fi', 'Thriller', 'Action'],
    description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
    cast: [
      { name: 'Leonardo DiCaprio', role: 'Cobb' },
      { name: 'Joseph Gordon-Levitt', role: 'Arthur' },
      { name: 'Elliot Page', role: 'Ariadne' },
      { name: 'Christopher Nolan', role: 'Director' },
    ],
  },
  {
    title: 'Interstellar', runtimeMin: 169, language: 'English', ageRating: 'UA', isTrending: true,
    releaseDate: daysFromNow(-30), genres: ['Sci-Fi', 'Drama', 'Adventure'],
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
    cast: [
      { name: 'Matthew McConaughey', role: 'Cooper' },
      { name: 'Anne Hathaway', role: 'Brand' },
      { name: 'Jessica Chastain', role: 'Murph' },
      { name: 'Christopher Nolan', role: 'Director' },
    ],
  },
  {
    title: 'Dune: Part Two', runtimeMin: 166, language: 'English', ageRating: 'UA', isTrending: true,
    releaseDate: daysFromNow(-20), genres: ['Sci-Fi', 'Adventure', 'Drama'],
    description: 'Paul Atreides unites with the Fremen to wage war against House Harkonnen and avenge his family.',
    cast: [
      { name: 'Timée Chalamet', role: 'Paul Atreides' },
      { name: 'Zendaya', role: 'Chani' },
      { name: 'Denis Villeneuve', role: 'Director' },
    ],
  },
  {
    title: 'The Dark Knight', runtimeMin: 152, language: 'English', ageRating: 'UA',
    releaseDate: daysFromNow(-60), genres: ['Action', 'Thriller', 'Drama'],
    description: 'Batman faces the Joker, a criminal mastermind who plunges Gotham City into anarchy.',
    cast: [
      { name: 'Christian Bale', role: 'Bruce Wayne' },
      { name: 'Heath Ledger', role: 'Joker' },
      { name: 'Christopher Nolan', role: 'Director' },
    ],
  },
  {
    title: 'Jawan', runtimeMin: 169, language: 'Hindi', ageRating: 'UA', isTrending: true,
    releaseDate: daysFromNow(-15), genres: ['Action', 'Thriller'],
    description: 'A man is driven by a personal vendetta to rectify the wrongs in society.',
    cast: [
      { name: 'Shah Rukh Khan', role: 'Vikram / Azad' },
      { name: 'Nayanthara', role: 'Narmada' },
      { name: 'Atlee', role: 'Director' },
    ],
  },
  {
    title: '3 Idiots', runtimeMin: 170, language: 'Hindi', ageRating: 'U',
    releaseDate: daysFromNow(-70), genres: ['Comedy', 'Drama'],
    description: 'Two friends search for their long-lost companion who inspired them to think differently.',
    cast: [
      { name: 'Aamir Khan', role: 'Rancho' },
      { name: 'R. Madhavan', role: 'Farhan' },
      { name: 'Rajkumar Hirani', role: 'Director' },
    ],
  },
  {
    title: 'Oppenheimer', runtimeMin: 180, language: 'English', ageRating: 'A',
    releaseDate: daysFromNow(-50), genres: ['Drama', 'Thriller'],
    description: 'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    cast: [
      { name: 'Cillian Murphy', role: 'J. Robert Oppenheimer' },
      { name: 'Emily Blunt', role: 'Kitty Oppenheimer' },
      { name: 'Christopher Nolan', role: 'Director' },
    ],
  },
  {
    title: 'Avatar: Fire and Ash', runtimeMin: 190, language: 'English', ageRating: 'UA',
    releaseDate: daysFromNow(21), genres: ['Sci-Fi', 'Adventure'],
    description: 'The Sully family faces a new threat on Pandora in the next chapter of the Avatar saga.',
    cast: [
      { name: 'Sam Worthington', role: 'Jake Sully' },
      { name: 'Zoe Saldana', role: 'Neytiri' },
      { name: 'James Cameron', role: 'Director' },
    ],
  },
  {
    title: 'Dune: Messiah', runtimeMin: 165, language: 'English', ageRating: 'UA',
    releaseDate: daysFromNow(45), genres: ['Sci-Fi', 'Drama'],
    description: 'Twelve years after the events of Dune: Part Two, Paul Atreides reckons with his empire.',
    cast: [
      { name: 'Timée Chalamet', role: 'Paul Atreides' },
      { name: 'Denis Villeneuve', role: 'Director' },
    ],
  },
];

interface ScreenSeed {
  name: string;
  screenType: ScreenType;
  equipment: string[];
  layout: LayoutRow[];
  assignManager?: boolean;
}

interface TheatreSeed {
  chain: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  screens: ScreenSeed[];
}

const THEATRES: TheatreSeed[] = [
  {
    chain: 'PVR', name: 'PVR Forum Mall', city: 'Bangalore',
    address: 'Forum Mall, Hosur Road, Koramangala, Bangalore', lat: 12.9345, lng: 77.6115,
    screens: [
      { name: 'Screen 1', screenType: 'IMAX', equipment: ['IMAX', 'DOLBY_ATMOS', '4K'], layout: standardLayout(16), assignManager: true },
      { name: 'Screen 2', screenType: 'DOLBY_ATMOS', equipment: ['DOLBY_ATMOS'], layout: standardLayout(14), assignManager: true },
      { name: 'Screen 3', screenType: 'STANDARD', equipment: ['2K'], layout: standardLayout(12) },
    ],
  },
  {
    chain: 'Cinepolis', name: 'Cinepolis Koramangala', city: 'Bangalore',
    address: '5th Block, Koramangala, Bangalore', lat: 12.9352, lng: 77.6245,
    screens: [
      { name: 'Screen 1', screenType: 'FOURDX', equipment: ['4DX'], layout: standardLayout(12) },
      { name: 'Screen 2', screenType: 'STANDARD', equipment: ['2K'], layout: standardLayout(14) },
    ],
  },
  {
    chain: 'PVR', name: 'PVR Phoenix Marketcity', city: 'Bangalore',
    address: 'Phoenix Marketcity, Whitefield, Bangalore', lat: 12.9975, lng: 77.6966,
    screens: [
      { name: 'Screen 1', screenType: 'IMAX', equipment: ['IMAX', 'DOLBY_ATMOS'], layout: standardLayout(16) },
      { name: 'Screen 2', screenType: 'STANDARD', equipment: ['2K'], layout: standardLayout(14) },
    ],
  },
  {
    chain: 'INOX', name: 'INOX Garuda Mall', city: 'Bangalore',
    address: 'Garuda Mall, Magrath Road, Bangalore', lat: 12.9698, lng: 77.6098,
    screens: [
      { name: 'Screen 1', screenType: 'DOLBY_ATMOS', equipment: ['DOLBY_ATMOS'], layout: standardLayout(14) },
      { name: 'Screen 2', screenType: 'STANDARD', equipment: ['2K'], layout: standardLayout(12) },
    ],
  },
];

// ── seed steps ──────────────────────────────────────────────
async function seedGenres() {
  await Promise.all(GENRES.map((name) => prisma.genre.upsert({ where: { name }, update: {}, create: { name } })));
  console.log(`✓ genres: ${GENRES.length}`);
}

async function seedUsers(): Promise<Record<Role, string>> {
  const ids = {} as Record<Role, string>;
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: u.phone },
      update: { role: u.role, name: u.name, isActive: true },
      create: {
        name: u.name, email: u.email, emailVerified: true,
        phoneNumber: u.phone, phoneNumberVerified: true, role: u.role, isActive: true,
      },
    });
    ids[u.role] = user.id;
    console.log(`✓ user: ${u.role.padEnd(12)} ${u.phone}`);
  }
  return ids;
}

async function seedMovies() {
  let created = 0;
  for (const m of MOVIES) {
    const existing = await prisma.movie.findFirst({ where: { title: m.title }, select: { id: true } });
    if (existing) continue;
    await prisma.movie.create({
      data: {
        title: m.title, description: m.description, runtimeMin: m.runtimeMin,
        releaseDate: m.releaseDate, language: m.language, ageRating: m.ageRating,
        posterUrl: POSTER_BY_TITLE[m.title] ?? null,
        isTrending: m.isTrending ?? false, cast: m.cast,
        genres: { create: m.genres.map((name) => ({ genre: { connect: { name } } })) },
      },
    });
    created++;
  }
  console.log(`✓ movies: ${created} created (${MOVIES.length} total)`);
}

async function seedVenues(managerId: string) {
  let screenCount = 0;
  let seatCount = 0;
  for (const t of THEATRES) {
    let theatre = await prisma.theatre.findFirst({ where: { chain: t.chain, name: t.name }, select: { id: true } });
    if (!theatre) {
      theatre = await prisma.theatre.create({
        data: { chain: t.chain, name: t.name, city: t.city, address: t.address, lat: t.lat, lng: t.lng },
        select: { id: true },
      });
    }
    for (const s of t.screens) {
      const existing = await prisma.screen.findFirst({ where: { theatreId: theatre.id, name: s.name }, select: { id: true } });
      if (existing) continue;
      const seats = expandSeats(s.layout);
      await prisma.screen.create({
        data: {
          theatreId: theatre.id, name: s.name, screenType: s.screenType, equipment: s.equipment,
          managerId: s.assignManager ? managerId : null,
          seats: { create: seats },
        },
      });
      screenCount++;
      seatCount += seats.length;
    }
  }
  console.log(`✓ venues: ${THEATRES.length} theatres, ${screenCount} screens, ${seatCount} seats`);
}

// Base ticket price (paise) by screen type.
const BASE_PRICE: Record<ScreenType, number> = {
  STANDARD: 25000,
  DOLBY_ATMOS: 35000,
  IMAX: 40000,
  FOURDX: 45000,
};

// Daily showtime slots in UTC → IST 10:00 / 14:00 / 18:00 / 22:00 (4h apart,
// safely > longest runtime + 30-min cleaning gap so seeded shows never clash).
const SLOTS_UTC: Array<[number, number]> = [
  [4, 30],
  [8, 30],
  [12, 30],
  [16, 30],
];
const SEED_DAYS = 7;

function slotDate(dayOffset: number, hourUtc: number, minUtc: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hourUtc, minUtc, 0, 0);
  return d;
}

async function seedShows() {
  const now = Date.now();
  const released = await prisma.movie.findMany({
    where: { releaseDate: { lte: new Date() } },
    select: { id: true, runtimeMin: true, title: true },
    orderBy: { title: 'asc' },
  });
  const screens = await prisma.screen.findMany({ select: { id: true, screenType: true } });
  if (released.length === 0 || screens.length === 0) return;

  let created = 0;
  let rot = 0;
  for (let s = 0; s < screens.length; s++) {
    const screen = screens[s]!;
    for (let day = 0; day < SEED_DAYS; day++) {
      for (let slot = 0; slot < SLOTS_UTC.length; slot++) {
        const [h, m] = SLOTS_UTC[slot]!;
        const startsAt = slotDate(day, h, m);
        if (startsAt.getTime() <= now + 60 * 60 * 1000) continue; // must be comfortably future

        const movie = released[rot % released.length]!;
        rot++;

        const exists = await prisma.show.findFirst({
          where: { screenId: screen.id, startsAt },
          select: { id: true },
        });
        if (exists) continue;

        const endsAt = new Date(startsAt.getTime() + movie.runtimeMin * 60 * 1000);
        const format: Format =
          screen.screenType === 'IMAX' && slot % 2 === 0 ? 'THREE_D' : 'TWO_D';

        await prisma.show.create({
          data: {
            movieId: movie.id,
            screenId: screen.id,
            startsAt,
            endsAt,
            format,
            basePrice: BASE_PRICE[screen.screenType],
          },
        });
        created++;
      }
    }
  }
  console.log(`✓ shows: ${created} created across ${screens.length} screens / ${SEED_DAYS} days`);
}

async function seedReviews() {
  const inception = await prisma.movie.findFirst({ where: { title: 'Inception' }, select: { id: true } });
  if (!inception) return;
  const already = await prisma.review.count({ where: { movieId: inception.id } });
  if (already > 0) return;
  await prisma.review.createMany({
    data: [
      { movieId: inception.id, author: 'Rahul', rating: 5, comment: 'Mind-bending. A modern classic.' },
      { movieId: inception.id, author: 'Priya', rating: 4, comment: 'Loved the visuals, needs a rewatch.' },
      { movieId: inception.id, author: 'Sam', rating: 5, comment: 'The score alone is worth it.' },
    ],
  });
  console.log('✓ reviews: 3 (Inception)');
}

async function seedPromos() {
  const promos = [
    {
      code: 'WELCOME50',
      description: '50% off your booking (up to ₹150)',
      percentOff: 50,
      maxDiscount: 15000,
      minAmount: 20000,
    },
    {
      code: 'FLAT100',
      description: '₹100 off on orders above ₹300',
      flatOff: 10000,
      minAmount: 30000,
    },
  ];
  for (const p of promos) {
    await prisma.promo.upsert({
      where: { code: p.code },
      update: {},
      create: {
        ...p,
        isActive: true,
        validFrom: daysFromNow(-1),
        validTo: daysFromNow(60),
      },
    });
  }
  console.log(`✓ promos: ${promos.length}`);
}

async function main() {
  console.log('🌱 Seeding CineBook…');
  await seedGenres();
  const ids = await seedUsers();
  await seedMovies();
  await seedVenues(ids.HALL_MANAGER);
  await seedShows();
  await seedReviews();
  await seedPromos();
  console.log('\n✅ Seed complete. Log in with a demo phone (dev echoes the OTP):');
  console.log('   curl -XPOST localhost:4000/api/auth/otp/request -H "content-type: application/json" -d \'{"phone":"+919000000001"}\'');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
