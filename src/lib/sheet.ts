// Shared behaviour for the overlays (#modal, #settings, #filters-panel). On phones the CSS in Layout.astro turns
// them into bottom sheets; this adds what CSS can't:
// - on phones: drag the top bar (.sheet-bar) down, or pull the content down when it's scrolled to the top, to close;
//   with { closeAtEnd: true } (detail sheet), pushing up past the end shows "Release to close" (.release-hint);
// - tap outside to close a <dialog> (Safari doesn't support closedby="any"; popovers light-dismiss natively);
// - the Back button closes the open overlay instead of leaving the page.

const PHONE = '(max-width: 640px)';

export function sheet(el: HTMLElement, opts: { closeAtEnd?: boolean } = {}) {
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

  const phone = () => matchMedia(PHONE).matches;
  // finish a drag: close (sliding down from where the finger left it) or snap back
  const release = (shouldClose: boolean) => {
    el.style.transition = '';
    if (shouldClose) {
      el.style.translate = '0 100%';
      close();
      setTimeout(() => (el.style.translate = ''), 300);
    } else {
      el.style.translate = '';
    }
  };

  // Gestures on the content (phones). Touch events, not pointer events: the browser cancels pointer events as
  // soon as it starts scrolling. A gesture only takes over when scrolling can't go further that way.
  const hint = el.querySelector<HTMLElement>('.release-hint');
  const atTop = () => el.scrollTop <= 0;
  const atEnd = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  let tY = 0, tT = 0, pull = 0;
  let mode: 'down' | 'up' | 'scroll' | null = null;
  el.addEventListener(
    'touchstart',
    (e) => {
      mode = (e.target as HTMLElement).closest('.sheet-bar') || e.touches.length > 1 || !phone() ? 'scroll' : null;
      tY = e.touches[0].clientY;
      tT = performance.now();
      pull = 0;
    },
    { passive: true }
  );
  el.addEventListener(
    'touchmove',
    (e) => {
      if (mode === 'scroll') return;
      const dy = e.touches[0].clientY - tY;
      if (mode === null) {
        if (Math.abs(dy) < 6) return;
        if (dy > 0 && atTop()) mode = 'down';
        else if (dy < 0 && opts.closeAtEnd && atEnd()) mode = 'up';
        else return void (mode = 'scroll');
        el.style.transition = 'none';
      }
      e.preventDefault(); // the sheet moves instead of the page scrolling
      if (mode === 'down') {
        pull = Math.max(0, dy);
        el.style.translate = `0 ${pull}px`;
      } else {
        pull = Math.max(0, -dy);
        el.style.translate = `0 ${-Math.min(pull * 0.3, 50)}px`; // rises a little, with resistance
        if (hint) {
          hint.hidden = false;
          hint.toggleAttribute('data-ready', pull > 90);
        }
      }
    },
    { passive: false }
  );
  const touchEnd = () => {
    if (mode !== 'down' && mode !== 'up') return;
    const flick = mode === 'down' && pull > 20 && pull / (performance.now() - tT) > 0.5;
    if (hint) hint.hidden = true;
    release(mode === 'down' ? pull > 80 || flick : pull > 90);
    mode = null;
  };
  el.addEventListener('touchend', touchEnd);
  el.addEventListener('touchcancel', touchEnd);

  // Drag the top bar down to close (phones): close past 80px or on a quick flick
  const bar = el.querySelector<HTMLElement>('.sheet-bar');
  if (!bar) return;
  let startY = 0, startT = 0, dy = 0, dragging = false;
  bar.addEventListener('pointerdown', (e) => {
    if (!phone() || (e.target as HTMLElement).closest('button')) return;
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
    const flick = dy > 20 && dy / (performance.now() - startT) > 0.5;
    release(dy > 80 || flick);
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
}
