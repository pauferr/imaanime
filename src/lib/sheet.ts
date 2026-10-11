// Shared behaviour for the overlays (#modal, #settings, #filters-panel). On phones the CSS in Layout.astro turns
// them into bottom sheets; this adds what CSS can't:
// - swipe down on the top bar (.sheet-bar) to close, on phones;
// - tap outside to close a <dialog> (Safari doesn't support closedby="any"; popovers light-dismiss natively);
// - the Back button closes the open overlay instead of leaving the page.

const PHONE = '(max-width: 640px)';

export function sheet(el: HTMLElement) {
  const isDialog = el instanceof HTMLDialogElement;
  const isOpen = () => (isDialog ? (el as HTMLDialogElement).open : el.matches(':popover-open'));
  const close = () => (isDialog ? (el as HTMLDialogElement).close() : el.hidePopover());

  if (isDialog) {
    // a click whose point is outside the dialog's box landed on the backdrop
    el.addEventListener('click', (e) => {
      const r = el.getBoundingClientRect();
      if (e.target === el && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) close();
    });
  }

  // Back button: opening adds a history entry; going back closes. Closing any other way removes that entry.
  // Pages that keep state in the URL (/) re-sync it on popstate, so the entry's URL doesn't matter.
  let pushed = false;
  const opened = () => {
    if (!pushed) history.pushState(history.state, '');
    pushed = true;
  };
  const closed = () => {
    if (!pushed) return;
    pushed = false;
    history.back();
  };
  addEventListener('popstate', () => {
    if (pushed && isOpen()) {
      pushed = false;
      close();
    }
  });
  if (isDialog) new MutationObserver(() => (isOpen() ? opened() : closed())).observe(el, { attributeFilter: ['open'] });
  else el.addEventListener('toggle', (e) => ((e as ToggleEvent).newState === 'open' ? opened() : closed()));

  // Swipe down to close (phones): drag the sheet with the finger, close past 80px or on a quick flick
  const bar = el.querySelector<HTMLElement>('.sheet-bar');
  if (!bar) return;
  let startY = 0, startT = 0, dy = 0, dragging = false;
  bar.addEventListener('pointerdown', (e) => {
    if (!matchMedia(PHONE).matches || (e.target as HTMLElement).closest('button')) return;
    dragging = true;
    startY = e.clientY;
    startT = performance.now();
    dy = 0;
    bar.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    el.style.translate = `0 ${dy}px`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.style.transition = '';
    const flick = dy > 20 && dy / (performance.now() - startT) > 0.5;
    if (dy > 80 || flick) {
      // keep sliding down from where the finger left it, then clear the inline offset
      el.style.translate = '0 100%';
      close();
      setTimeout(() => (el.style.translate = ''), 300);
    } else {
      el.style.translate = ''; // snap back
    }
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
}
