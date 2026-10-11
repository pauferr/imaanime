// Jikan v4 (unofficial MyAnimeList API): https://docs.api.jikan.moe/

const API = 'https://api.jikan.moe/v4/seasons/now';
const MAX_PAGES = 10; // 25 per page; a season is usually 3–5 pages
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Only what the site uses: it is embedded in every page's HTML
export type Anime = {
  url: string;
  img: string;
  title: string;
  titleEn: string | null;
  synopsis: string;
  score: number | null;
  votes: number | null;
  episodes: number | null;
  day: string | null; // "Saturdays", Japan time
  time: string | null; // "23:30", Japan time
  broadcast: string; // original text, e.g. "Saturdays at 23:30 (JST)"
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
  synopsis: (a.synopsis ?? 'No synopsis yet.').replace(/\s*\[Written by MAL Rewrite\]\s*$/, ''),
  score: a.score,
  votes: a.scored_by,
  episodes: a.episodes,
  day: a.broadcast.day,
  time: a.broadcast.time,
  broadcast: a.broadcast.string ?? 'Unknown',
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

let cache: ReturnType<typeof load> | undefined;

// ponytail: in-process memory cache; `astro build` fetches once for both pages, dev keeps it until restart
export function seasonNow() {
  cache ??= load().catch((err) => {
    cache = undefined; // retry on the next request
    throw err;
  });
  return cache;
}

export const seasonLabel = (s: { season: string; year: number | string }) =>
  s.season ? `${s.season[0].toUpperCase()}${s.season.slice(1)} ${s.year}` : 'Current season';

// For <script type="application/json">: escaping "<" stops a "</script>" in the data from closing the tag
export const toJsonScript = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c');
