/* Which element scrolls.

   On a wide window the page is a card inset from the window edges and the
   card scrolls itself; the window never moves. On a phone there is no card
   and the window scrolls the ordinary way — a page that scrolls inside a box
   is a page whose address bar never gets out of the way.

   So the scroller is one of two things depending on the width, and it changes
   under you when the window is dragged across the breakpoint. Everything that
   reads a position, measures the visible height, or scrolls somewhere comes
   through here instead of touching `window`, so none of it has to know which
   of the two it is talking to at the time.

   Listeners bind to the document in the capture phase, which sees a scroll
   event from any element on its way down. One binding therefore survives the
   breakpoint being crossed. It also sees the rail, the files column and the
   build menu scrolling inside themselves, which is not what any caller means
   by "the page moved", so those are filtered out here rather than in six
   places. */

const WIDE = '(min-width: 901px)';

let card = null;

/** The element the page scrolls in. */
export function scroller() {
  if (!card?.isConnected) card = document.querySelector('.inset');
  return (card && matchMedia(WIDE).matches && getComputedStyle(card).overflowY !== 'visible')
    ? card
    : document.scrollingElement;
}

export function scrollTop() { return scroller().scrollTop; }

/** How much of the page is on screen, and how much there is of it. */
export function viewH() { return scroller().clientHeight; }
export function scrollH() { return scroller().scrollHeight; }

/** Where the scrolled content starts, in viewport pixels: zero when the
    window scrolls, the card's top edge when the card does. What turns a
    getBoundingClientRect into a position in the page. */
export function viewTop() {
  const el = scroller();
  return el === document.scrollingElement ? 0 : el.getBoundingClientRect().top;
}

/** How far an element sits from the top of the scrolled content. */
export function offsetIn(el) {
  return el.getBoundingClientRect().top - viewTop() + scrollTop();
}

export function scrollToY(top, behavior) {
  scroller().scrollTo(behavior ? { top, behavior } : { top });
}

/** Returns the way to take the listener back off again. */
export function onScroll(fn, opts) {
  const on = (e) => {
    if (e.target === document || e.target === scroller()) fn(e);
  };
  document.addEventListener('scroll', on, { passive: true, capture: true, ...opts });
  return () => document.removeEventListener('scroll', on, { capture: true });
}
