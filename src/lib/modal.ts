// Rellena y abre el <dialog> de src/components/Modal.astro
import type { Anime } from './jikan';
import { currentTz, localSlot } from './time';

export function openModal(a: Anime) {
  const modal = document.getElementById('modal') as HTMLDialogElement;
  // textContent, no innerHTML: los datos vienen de una API externa
  const field = <T extends HTMLElement>(f: string) => modal.querySelector<T>(`[data-f="${f}"]`)!;
  const set = (f: string, v: string | number) => (field(f).textContent = String(v));
  const en = (document.getElementById('lang-en') as HTMLInputElement).checked && a.title_english;

  field<HTMLImageElement>('img').src = a.images.webp.large_image_url;
  set('title', en ? a.title_english! : a.title);
  set('alt', en ? a.title : a.title_english ?? '');
  set('score', a.score == null ? '★ N/A' : `★ ${a.score.toFixed(2)}`);
  set('votes', a.scored_by ? `(${a.scored_by.toLocaleString('es')} votos en MAL)` : '');
  set('synopsis', a.synopsis);
  set('episodes', a.episodes ?? '?');
  set('studios', a.studios.map((s) => s.name).join(', '));
  set('aired', a.aired.string);
  const slot = localSlot(a.broadcast, currentTz());
  set('broadcast', slot ? `${slot.long} (tu hora) · ${a.broadcast.string}` : a.broadcast.string);
  field<HTMLAnchorElement>('url').href = a.url;
  field('genres').replaceChildren(
    ...a.genres.map((g) => Object.assign(document.createElement('li'), { textContent: g.name }))
  );
  modal.showModal();
}
