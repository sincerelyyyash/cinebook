/**
 * Real theatrical poster URLs for the seeded movies, sourced from Wikimedia
 * Commons (the images that back each film's Wikipedia article). All URLs were
 * verified to return `200 image/*`. Hotlink-friendly; served to any client that
 * sends a non-empty User-Agent (the app sends one — see AppNetworkImage).
 *
 * Side-effect free so it can be shared by `seed.ts` and `scripts/backfill-posters.ts`.
 * Keyed by the exact movie `title` used in the seed.
 */
export const POSTER_BY_TITLE: Record<string, string> = {
  Inception:
    'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg',
  Interstellar:
    'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg',
  'Dune: Part Two':
    'https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg',
  'The Dark Knight':
    'https://upload.wikimedia.org/wikipedia/en/1/1c/The_Dark_Knight_%282008_film%29.jpg',
  Jawan: 'https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg',
  '3 Idiots': 'https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg',
  Oppenheimer:
    'https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg',
  'Avatar: Fire and Ash':
    'https://upload.wikimedia.org/wikipedia/en/9/95/Avatar_Fire_and_Ash_poster.jpeg',
  'Dune: Messiah':
    'https://upload.wikimedia.org/wikipedia/en/b/b8/Dune%2C_Part_Three_%28film_poster%29.jpg',
  Tenet: 'https://upload.wikimedia.org/wikipedia/en/1/14/Tenet_movie_poster.jpg',
};
