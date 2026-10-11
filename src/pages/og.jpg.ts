// Share image (Open Graph): a collage of this season's top-rated covers under the brand overlay.
// Built with every deploy, so it follows the season. The overlay (gradient, 今 logo, name, tagline) is a
// pre-rendered PNG: the build machine has no CJK fonts, so no text is drawn here.
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { seasonNow } from '../lib/mal';

const W = 1200, H = 630;
const COLS = 8, ROWS = 3;
const TILE_W = W / COLS; // 150
const TILE_H = H / ROWS; // 210: close to the 45:64 poster ratio; `fit: cover` trims the few extra pixels

async function cover(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).resize(TILE_W, TILE_H, { fit: 'cover' }).toBuffer();
  } catch {
    return null; // a missing cover just leaves a dark tile
  }
}

export const GET: APIRoute = async () => {
  const { data } = await seasonNow();
  const top = data
    .filter((a) => a.img && a.score != null)
    .sort((a, b) => b.score! - a.score! || (b.votes ?? 0) - (a.votes ?? 0))
    .slice(0, COLS * ROWS);
  const tiles = await Promise.all(top.map((a) => cover(a.img)));

  const layers = tiles.flatMap((t, i) =>
    t ? [{ input: t, left: (i % COLS) * TILE_W, top: Math.floor(i / COLS) * TILE_H }] : []
  );
  const overlay = await readFile('src/og-overlay.png'); // builds run from the project root

  // covers first, brand overlay on top
  const jpg = await sharp({ create: { width: W, height: H, channels: 3, background: '#0f0f12' } })
    .composite([...layers, { input: overlay, left: 0, top: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
};
