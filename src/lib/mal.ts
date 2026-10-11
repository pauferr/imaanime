// Official MyAnimeList API v2: https://myanimelist.net/apiconfig/references/api/v2
// Reading public data only needs a client ID (X-MAL-CLIENT-ID header), no user login.
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const FIELDS = [
  'title', 'main_picture', 'alternative_titles', 'synopsis', 'mean', 'num_scoring_users', 'num_episodes',
  'start_date', 'broadcast', 'studios', 'genres', 'status', 'start_season', 'media_type',
].join(',');
const SEASONS = ['winter', 'spring', 'summer', 'fall'];

// Only what the site uses: it is embedded in every page's HTML
export type Anime = {
  url: string;
  img: string;
  title: string; // romaji
  titleEn: string | null;
  synopsis: string | null;
  score: number | null; // MAL mean score
  votes: number | null;
  episodes: number | null;
  day: string | null; // "saturday", Japan time
  time: string | null; // "23:30", Japan time
  isNew: boolean; // starts this season (vs. continuing from an earlier one)
  from: string | null; // premiere date: "2026-10-04", sometimes partial ("2026-10")
  studios: string[];
  genres: string[];
};

// Anime seasons follow the calendar quarters in Japan
export function currentSeason(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 3600e3);
  return { year: jst.getUTCFullYear(), season: SEASONS[Math.floor(jst.getUTCMonth() / 3)] };
}

async function get(url: string) {
  const clientId = import.meta.env.MAL_CLIENT_ID;
  if (!clientId) throw new Error('MAL_CLIENT_ID is not set (see .env locally, project env vars on Vercel)');
  const res = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': clientId }, signal: AbortSignal.timeout(15_000) });
  if (res.status === 401 || res.status === 403) throw new Error(`MAL rejected the client ID (${res.status}); check MAL_CLIENT_ID`);
  if (!res.ok) throw new Error(`MAL returned ${res.status} for ${url}`);
  return res.json();
}

const lean = (a: any, isNew: boolean): Anime => ({
  url: `https://myanimelist.net/anime/${a.id}`,
  img: a.main_picture?.large ?? a.main_picture?.medium ?? '',
  title: a.title,
  titleEn: a.alternative_titles?.en || null,
  synopsis: a.synopsis?.replace(/\s*\[Written by MAL Rewrite\]\s*$/, '') || null,
  score: a.mean ?? null,
  votes: a.num_scoring_users || null,
  episodes: a.num_episodes || null, // MAL uses 0 for "unknown"
  day: a.broadcast?.day_of_the_week ?? null,
  time: a.broadcast?.start_time ?? null,
  isNew,
  from: a.start_date ?? null,
  studios: (a.studios ?? []).map((s: any) => s.name),
  genres: (a.genres ?? []).map((g: any) => g.name),
});

async function load() {
  const { year, season } = currentSeason();
  const nodes: any[] = [];
  // nsfw=false (the default) excludes adult content; 500 is the max page size, so this is usually one request
  let url: string | undefined = `https://api.myanimelist.net/v2/anime/season/${year}/${season}?limit=500&fields=${FIELDS}`;
  while (url) {
    const json = await get(url);
    nodes.push(...json.data.map((d: any) => d.node));
    url = json.paging?.next;
  }
  // Airing now: this season's shows (airing or about to premiere) plus continuing ones from earlier seasons.
  // MAL's season list also includes finished shows, movies and music videos, which are dropped.
  const startsNow = (a: any) => a.start_season?.year === year && a.start_season?.season === season;
  const airing = nodes.filter(
    (a) =>
      !['movie', 'music'].includes(a.media_type) &&
      (a.status === 'currently_airing' || (a.status === 'not_yet_aired' && startsNow(a)))
  );
  return { season, year, data: airing.map((a) => lean(a, startsNow(a))) };
}

type Season = Awaited<ReturnType<typeof load>>;

const DEV_CACHE = 'node_modules/.cache/imaanime/season-now.json';
const DEV_CACHE_TTL = 6 * 3600e3; // same cadence as the production rebuild
const FAILURE_TTL = 60e3;

// ponytail: dev-only file cache so reloads and restarts don't wait on MAL; `astro build` always fetches fresh.
// If MAL is unreachable, dev falls back to the last good response, however old.
async function loadDev(): Promise<Season> {
  const cached = await stat(DEV_CACHE).then(
    async (s) => ({ age: Date.now() - s.mtimeMs, data: JSON.parse(await readFile(DEV_CACHE, 'utf8')) as Season }),
    () => null
  );
  if (cached && cached.age < DEV_CACHE_TTL) return cached.data;
  try {
    const fresh = await load();
    await mkdir(dirname(DEV_CACHE), { recursive: true });
    await writeFile(DEV_CACHE, JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    if (!cached) throw err;
    console.warn(`[mal] ${(err as Error).message}; using cached data from ${Math.round(cached.age / 3600e3)} h ago`);
    return cached.data;
  }
}

let cache: Promise<Season> | undefined;

// In-process memory cache: `astro build` fetches once for both pages, dev keeps it until restart
export function seasonNow() {
  cache ??= (import.meta.env.DEV ? loadDev() : load()).catch((err) => {
    // remember the failure briefly: reloads fail fast instead of each waiting for the timeout
    setTimeout(() => (cache = undefined), FAILURE_TTL).unref();
    throw err;
  });
  return cache;
}

// For <script type="application/json">: escaping "<" stops a "</script>" in the data from closing the tag
export const toJsonScript = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c');
