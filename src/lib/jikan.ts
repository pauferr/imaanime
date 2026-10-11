// Jikan v4 (API no oficial de MyAnimeList): https://docs.api.jikan.moe/

const API = 'https://api.jikan.moe/v4/seasons/now';
const MAX_PAGES = 10; // 25 por página; una season ronda 3–5 páginas
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Solo lo que usa la web: va incrustado en el HTML de cada página
export type Anime = {
  url: string;
  img: string;
  title: string;
  titleEn: string | null;
  synopsis: string;
  score: number | null;
  votes: number | null;
  episodes: number | null;
  day: string | null; // "Saturdays", en hora de Japón
  time: string | null; // "23:30", en hora de Japón
  broadcast: string; // texto original, p. ej. "Saturdays at 23:30 (JST)"
  from: string | null; // fecha de estreno ISO
  aired: string; // texto original, p. ej. "Oct 4, 2026 to ?"
  studios: string[];
  genres: string[];
};

async function get(url: string, tries = 3): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 429 && tries > 1) {
    await sleep(1500);
    return get(url, tries - 1);
  }
  if (!res.ok) throw new Error(`Jikan respondió ${res.status} en ${url}`);
  return res.json();
}

const lean = (a: any): Anime => ({
  url: a.url,
  img: a.images.webp.large_image_url,
  title: a.title,
  titleEn: a.title_english,
  synopsis: (a.synopsis ?? 'Sin sinopsis.').replace(/\s*\[Written by MAL Rewrite\]\s*$/, ''),
  score: a.score,
  votes: a.scored_by,
  episodes: a.episodes,
  day: a.broadcast.day,
  time: a.broadcast.time,
  broadcast: a.broadcast.string ?? 'Desconocido',
  from: a.aired.from,
  aired: a.aired.string,
  studios: a.studios.map((s: any) => s.name),
  genres: a.genres.map((g: any) => g.name),
});

async function load() {
  const byId = new Map<number, any>(); // Jikan a veces repite entradas entre páginas
  for (let page = 1; page <= MAX_PAGES; page++) {
    const json = await get(`${API}?sfw=true&page=${page}`);
    for (const a of json.data) byId.set(a.mal_id, a);
    if (!json.pagination.has_next_page) break;
    await sleep(400); // límite de Jikan: 3 peticiones/s
  }
  const all = [...byId.values()];
  const first = all.find((a) => a.season);
  return { season: first?.season ?? '', year: first?.year ?? '', data: all.map(lean) };
}

let cache: ReturnType<typeof load> | undefined;

// ponytail: caché en memoria del proceso; en `astro build` se descarga una vez para las dos páginas, en dev hasta reiniciar
export function seasonNow() {
  cache ??= load().catch((err) => {
    cache = undefined; // reintentar en la siguiente petición
    throw err;
  });
  return cache;
}

export const seasonLabel = (s: { season: string; year: number | string }) =>
  s.season ? `${s.season[0].toUpperCase()}${s.season.slice(1)} ${s.year}` : 'Season actual';

// Para <script type="application/json">: escapar "<" evita que un "</script>" en los datos cierre la etiqueta
export const toJsonScript = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c');
