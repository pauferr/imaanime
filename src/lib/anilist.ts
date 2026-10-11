// AniList GraphQL API (free, no key): exact per-episode air times, which MAL doesn't publish.
// https://docs.anilist.co — rate limit 30 requests/min at the time of writing.

const API = 'https://graphql.anilist.co';
const DAY = 86400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query(q: string, variables: object, tries = 3): Promise<any> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429 && tries > 1) {
    await sleep((Number(res.headers.get('retry-after')) || 30) * 1000);
    return query(q, variables, tries - 1);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.errors) throw new Error(`AniList returned ${res.status}: ${JSON.stringify(json?.errors ?? '')}`);
  await sleep(2100); // stay under 30 requests/min
  return json.data;
}

export type Related = { url: string; title: string; titleEn: string | null };
export type AniListInfo = {
  airings: [episode: number, unixSeconds: number][];
  prequel: Related | null; // previous season (direct relation only, not the whole franchise)
  sequel: Related | null;
};

const SEASON_FORMATS = ['TV', 'TV_SHORT', 'ONA'];

// The prequel/sequel that is another season, rather than a movie or special, when there is one
function related(edges: any[], type: 'PREQUEL' | 'SEQUEL'): Related | null {
  const candidates = edges.filter((e) => e.relationType === type && e.node.type === 'ANIME' && e.node.idMal);
  const e = candidates.find((c) => SEASON_FORMATS.includes(c.node.format)) ?? candidates[0];
  return e ? { url: `https://myanimelist.net/anime/${e.node.idMal}`, title: e.node.title.romaji, titleEn: e.node.title.english } : null;
}

/**
 * Per MAL id: episodes airing from 2 days ago to 9 days ahead (the window covers "today" in every
 * time zone even if a scheduled rebuild is missed for a while; [] means e.g. a week off), plus the
 * previous and next season. MAL ids that AniList doesn't know are absent from the map.
 */
export async function anilistInfo(malIds: number[]): Promise<Map<number, AniListInfo>> {
  const result = new Map<number, AniListInfo>();
  const anilistToMal = new Map<number, number>();

  for (let i = 0; i < malIds.length; i += 50) {
    const data = await query(
      `query($ids:[Int]){ Page(perPage:50){ media(idMal_in:$ids, type:ANIME){
        id idMal relations{ edges{ relationType node{ idMal type format title{ romaji english } } } }
      } } }`,
      { ids: malIds.slice(i, i + 50) }
    );
    for (const m of data.Page.media) {
      anilistToMal.set(m.id, m.idMal);
      const edges = m.relations?.edges ?? [];
      result.set(m.idMal, { airings: [], prequel: related(edges, 'PREQUEL'), sequel: related(edges, 'SEQUEL') });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  for (let page = 1; ; page++) {
    const data = await query(
      `query($ids:[Int], $from:Int, $to:Int, $page:Int){ Page(page:$page, perPage:50){
        pageInfo{ hasNextPage }
        airingSchedules(mediaId_in:$ids, airingAt_greater:$from, airingAt_lesser:$to, sort:TIME){ episode airingAt mediaId }
      } }`,
      { ids: [...anilistToMal.keys()], from: now - 2 * DAY, to: now + 9 * DAY, page }
    );
    for (const s of data.Page.airingSchedules) result.get(anilistToMal.get(s.mediaId)!)?.airings.push([s.episode, s.airingAt]);
    if (!data.Page.pageInfo.hasNextPage) break;
  }
  return result;
}
