// Fills and opens the <dialog> from src/components/Modal.astro
import type { Anime } from './jikan';
import { currentTz, localSlot } from './time';

export function openModal(a: Anime) {
  const modal = document.getElementById('modal') as HTMLDialogElement;
  // textContent, not innerHTML: the data comes from an external API
  const field = <T extends HTMLElement>(f: string) => modal.querySelector<T>(`[data-f="${f}"]`)!;
  const set = (f: string, v: string | number) => (field(f).textContent = String(v));
  const en = (document.getElementById('lang-en') as HTMLInputElement).checked && a.titleEn;

  field<HTMLImageElement>('img').src = a.img;
  set('title', en ? a.titleEn! : a.title);
  set('alt', en ? a.title : a.titleEn ?? '');
  set('score', a.score == null ? '★ N/A' : `★ ${a.score.toFixed(2)}`);
  set('votes', a.votes ? `(${a.votes.toLocaleString('es')} votos en MAL)` : '');
  set('synopsis', a.synopsis);
  set('episodes', a.episodes ?? '?');
  set('studios', a.studios.join(', '));
  set('aired', a.aired);
  const slot = localSlot(a, currentTz());
  set('broadcast', slot ? `${slot.long} (tu hora) · ${a.broadcast}` : a.broadcast);
  field<HTMLAnchorElement>('url').href = a.url;
  field('genres').replaceChildren(...a.genres.map((g) => Object.assign(document.createElement('li'), { textContent: g })));
  modal.showModal();
}
