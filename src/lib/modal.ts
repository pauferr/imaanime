// Fills and opens the <dialog> from src/components/Modal.astro
import type { Anime } from './mal';
import { clock, formatDate, jstSlot, localSlot, localTz } from './time';
import type { Related } from './anilist';

// "S03E05" for episodes; specials and movies are a single release, so their format name instead
export const episodeLabel = (a: Anime, ep: number, locale: Locale) =>
  ['tv', 'tv_short', 'ona'].includes(a.format) ? ui[locale].today.episode(ep, a.seasonNo) : ui[locale].formats.tag[a.format] || ui[locale].today.episode(ep);
import { pageLocale, ui, type Locale } from '../i18n';

// `cover`: the clicked card's image, which morphs into the modal image (View Transitions API)
export function openModal(a: Anime, cover?: HTMLImageElement) {
  const locale = pageLocale();
  const t = ui[locale].modal;
  const modal = document.getElementById('modal') as HTMLDialogElement;
  // textContent, not innerHTML: the data comes from an external API
  const field = <T extends HTMLElement>(f: string) => modal.querySelector<T>(`[data-f="${f}"]`)!;
  const set = (f: string, v: string | number) => (field(f).textContent = String(v));
  const row = (r: string, show: boolean) => (modal.querySelector<HTMLElement>(`[data-row="${r}"]`)!.hidden = !show);
  const en = (document.getElementById('titles-en') as HTMLInputElement).checked && a.titleEn;

  const img = field<HTMLImageElement>('img');
  img.src = a.img; // same URL as the card, already cached
  set('title', en ? a.titleEn! : a.title);
  set('alt', en ? a.title : a.titleEn ?? '');
  set('score', a.score == null ? '★ N/A' : `★ ${a.score.toFixed(2)}`);
  set('votes', a.votes ? t.votes(a.votes.toLocaleString(locale)) : '');
  set('synopsis', a.synopsis ?? ui[locale].noSynopsis);
  set('format', ui[locale].formats.name[a.format] ?? a.format);
  // AniList schedule: the next episode, and how many have aired (the one before it)
  const now = Date.now() / 1000;
  const next = a.airings?.find(([, at]) => at > now);
  const aired = next ? next[0] - 1 : a.airings?.filter(([, at]) => at <= now).at(-1)?.[0];
  set('episodes', aired ? t.episodesOf(aired, a.episodes ?? '?') : a.episodes ?? '?');
  row('next', !!next);
  if (next) {
    const when = new Date(next[1] * 1000).toLocaleString(locale, {
      weekday: 'short', month: 'short', day: 'numeric', ...clock(), timeZone: localTz(),
    });
    set('next', `${episodeLabel(a, next[0], locale)} · ${when}`);
  }
  for (const [key, rel] of [['prequel', a.prequel], ['sequel', a.sequel]] as [string, Related | null][]) {
    row(key, !!rel);
    if (rel) {
      field<HTMLAnchorElement>(key).href = rel.url;
      set(key, en ? rel.titleEn ?? rel.title : rel.title);
    }
  }
  set('studios', a.studios.join(', '));
  set('aired', a.from ? formatDate(a.from, locale) : '?');
  const slot = localSlot(a, localTz(), locale);
  const original = jstSlot(a, locale) ?? ui[locale].unknown;
  set('broadcast', slot ? `${slot.long} ${t.yourTime} · ${original}` : original);
  row('broadcast', a.format !== 'movie'); // a movie has a release date (Aired), not a weekly slot
  field<HTMLAnchorElement>('url').href = a.url;
  field('genres').replaceChildren(...a.genres.map((g) => Object.assign(document.createElement('li'), { textContent: g })));

  if (!cover || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    modal.showModal();
    return;
  }
  // only one element may hold the name at a time: card in the old snapshot, modal image in the new one
  cover.style.viewTransitionName = 'cover';
  const transition = document.startViewTransition(() => {
    cover.style.viewTransitionName = '';
    img.style.viewTransitionName = 'cover';
    modal.showModal();
  });
  transition.finished.finally(() => (img.style.viewTransitionName = ''));
}
