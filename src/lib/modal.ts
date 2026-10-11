// Fills and opens the <dialog> from src/components/Modal.astro
import type { Anime } from './jikan';
import { currentTz, localSlot } from './time';
import { pageLocale, ui } from '../i18n';

// `cover`: the clicked card's image, which morphs into the modal image (View Transitions API)
export function openModal(a: Anime, cover?: HTMLImageElement) {
  const locale = pageLocale();
  const t = ui[locale].modal;
  const modal = document.getElementById('modal') as HTMLDialogElement;
  // textContent, not innerHTML: the data comes from an external API
  const field = <T extends HTMLElement>(f: string) => modal.querySelector<T>(`[data-f="${f}"]`)!;
  const set = (f: string, v: string | number) => (field(f).textContent = String(v));
  const en = (document.getElementById('titles-en') as HTMLInputElement).checked && a.titleEn;

  const img = field<HTMLImageElement>('img');
  img.src = a.img; // same URL as the card, already cached
  set('title', en ? a.titleEn! : a.title);
  set('alt', en ? a.title : a.titleEn ?? '');
  set('score', a.score == null ? '★ N/A' : `★ ${a.score.toFixed(2)}`);
  set('votes', a.votes ? t.votes(a.votes.toLocaleString(locale)) : '');
  set('synopsis', a.synopsis ?? ui[locale].noSynopsis);
  set('episodes', a.episodes ?? '?');
  set('studios', a.studios.join(', '));
  set('aired', a.aired);
  const slot = localSlot(a, currentTz(), locale);
  const original = a.broadcast ?? ui[locale].unknown;
  set('broadcast', slot ? `${slot.long} ${t.yourTime} · ${original}` : original);
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
