// Jikan v4 (unofficial MyAnimeList API): https://docs.api.jikan.moe/
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const API = 'https://api.jikan.moe/v4/seasons/now';
const MAX_PAGES = 10; // 25 per page; a season is usually 3–5 pages
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Only what the site uses: it is embedded in every page's HTML
export type Anime = {
  url: string;
  img: string;
  title: string;
  titleEn: string | null;
  synopsis: string | null;
  score: number | null;
  votes: number | null;
  episodes: number | null;
  day: string | null; // "Saturdays", Japan time
  time: string | null; // "23:30", Japan time
  broadcast: string | null; // original text, e.g. "Saturdays at 23:30 (JST)"
  from: string | null; // ISO premiere date
  aired: string; // original text, e.g. "Oct 4, 2026 to ?"
  studios: string[];
  genres: string[];
};

async function get(url: string, tries = 3): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 429 && tries > 1) {
    await sleep(1500);
    return get(url, tries - 1);
  }
  if (!res.ok) throw new Error(`Jikan returned ${res.status} for ${url}`);
  return res.json();
}

const lean = (a: any): Anime => ({
  url: a.url,
  img: a.images.webp.large_image_url,
  title: a.title,
  titleEn: a.title_english,
  synopsis: a.synopsis?.replace(/\s*\[Written by MAL Rewrite\]\s*$/, '') ?? null,
  score: a.score,
  votes: a.scored_by,
  episodes: a.episodes,
  day: a.broadcast.day,
  time: a.broadcast.time,
  broadcast: a.broadcast.string,
  from: a.aired.from,
  aired: a.aired.string,
  studios: a.studios.map((s: any) => s.name),
  genres: a.genres.map((g: any) => g.name),
});

async function load() {
  const byId = new Map<number, any>(); // Jikan sometimes repeats entries across pages
  for (let page = 1; page <= MAX_PAGES; page++) {
    const json = await get(`${API}?sfw=true&page=${page}`);
    for (const a of json.data) byId.set(a.mal_id, a);
    if (!json.pagination.has_next_page) break;
    await sleep(400); // Jikan rate limit: 3 requests/s
  }
  const all = [...byId.values()];
  const first = all.find((a) => a.season);
  return { season: first?.season ?? '', year: first?.year ?? '', data: all.map(lean) };
}

type Season = Awaited<ReturnType<typeof load>>;

const DEV_CACHE = 'node_modules/.cache/imaanime/season-now.json';
const DEV_CACHE_TTL = 6 * 3600e3; // same cadence as the production rebuild
const FAILURE_TTL = 60e3;

// ponytail: dev-only file cache so reloads and restarts don't wait on Jikan; `astro build` always fetches fresh.
// If Jikan is down, dev falls back to the last good response, however old.
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
    console.warn(`[jikan] ${(err as Error).message}; using cached data from ${Math.round(cached.age / 3600e3)} h ago`);
    return cached.data;
  }
}

let cache: Promise<Season> | undefined;

// In-process memory cache: `astro build` fetches once for both pages, dev keeps it until restart
export function seasonNow() {
  cache ??= (import.meta.env.DEV ? loadDev() : load()).catch((err) => {
    // remember the failure briefly: reloads fail fast instead of each waiting for Jikan's timeout
    setTimeout(() => (cache = undefined), FAILURE_TTL).unref();
    throw err;
  });
  return cache;
}

// For <script type="application/json">: escaping "<" stops a "</script>" in the data from closing the tag
export const toJsonScript = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c');
