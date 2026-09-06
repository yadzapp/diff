/* One overlay at a time.

   The search palette and the keyboard-shortcuts list are both modals holding
   the body's scroll, so opening either has to shut the other. They live in
   separate modules and share nothing else, so rather than have the two import
   each other, each registers the way to close it here.

   Open/close also shares one fade: `.on` drives the CSS transition, and
   `hidden` is only set after the exit finishes so display:none does not cut
   the animation short. */

const closers = new Set();
const hideTimers = new WeakMap();

/** Register an overlay's own close function. */
export const onOverlay = (close) => closers.add(close);

/** Shut every registered overlay except the one asking. */
export function closeOthers(self) {
  for (const close of closers) if (close !== self) close();
}

/** Whether an animated overlay is currently open (or opening). */
export const overlayOpen = (el) => !!el?.classList.contains('on');

/**
 * Reveal a `.palette` (or anything that uses the same `.on` enter styles).
 * Returns false if it was already open.
 */
export function showOverlay(el, { bodyClass = 'palette-open' } = {}) {
  if (!el || overlayOpen(el)) return false;
  const pending = hideTimers.get(el);
  if (pending) {
    clearTimeout(pending);
    hideTimers.delete(el);
  }
  el.hidden = false;
  document.body.classList.add(bodyClass);
  // Two frames: one to apply display, one to let the starting styles paint
  // before `.on` transitions away from them.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('on'));
  });
  return true;
}

/**
 * Hide an animated overlay after its exit transition. Returns false if it
 * was already shut.
 */
export function hideOverlay(el, { bodyClass = 'palette-open' } = {}) {
  if (!el || (el.hidden && !overlayOpen(el))) return false;
  el.classList.remove('on');
  document.body.classList.remove(bodyClass);
  const pending = hideTimers.get(el);
  if (pending) clearTimeout(pending);
  const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  hideTimers.set(el, setTimeout(() => {
    hideTimers.delete(el);
    el.hidden = true;
  }, ms));
  return true;
}
