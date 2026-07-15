/**
 * Backfill real poster URLs onto existing movies (no re-seed / no data loss).
 *
 *   bun run scripts/backfill-posters.ts
 *
 * Idempotent: matches by exact title and sets `posterUrl` from the shared
 * Wikimedia map. Run it against a live DB whose movies were seeded before
 * posters existed.
 */
import { PrismaClient } from '@prisma/client';
import { POSTER_BY_TITLE } from '../prisma/movie-posters.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼  Backfilling movie posters…');
  let updated = 0;
  const missing: string[] = [];

  for (const [title, posterUrl] of Object.entries(POSTER_BY_TITLE)) {
    const res = await prisma.movie.updateMany({ where: { title }, data: { posterUrl } });
    if (res.count > 0) {
      updated += res.count;
      console.log(`  ✓ ${title}`);
    } else {
      missing.push(title);
    }
  }

  // Surface any seeded movies we have no poster for, so it never silently skips.
  const withoutPoster = await prisma.movie.findMany({
    where: { posterUrl: null },
    select: { title: true },
  });

  console.log(`\n✅ Updated ${updated} movie(s).`);
  if (missing.length) console.log(`ℹ️  No DB row matched: ${missing.join(', ')}`);
  if (withoutPoster.length) {
    console.log(`⚠️  Still without a poster: ${withoutPoster.map((m) => m.title).join(', ')}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
