/* The rail's width, and getting it out of the way.

   Two hundred and forty pixels, the same on every machine. A draggable edge
   answers the wrong question: the reader on a 13" laptop who wants the space
   back does not want a narrower column of the same words, they want the page,
   and that is what the button and `[` already give them. All or nothing, and
   one number to keep the rail and the stylesheet agreeing about.

   Shut is shut: there is no icon-only version of it. An icon rail looks tidy
   and reads as a row of ambiguous glyphs you have to hover one at a time, and
   the things in this one are words — "Globals", "Hierarchy", "5_Mission" —
   that a picture cannot stand in for. What is left instead is a strip down the
   edge of the window: resting on it brings the rail back over the page to be
   read, and pressing it brings the rail back for good. A peek is looking
   rather than opening, so nothing reflows under it and nothing is remembered.

   What is remembered is whether the rail is shut, and the script in <head>
   (layout() in src/generate/html.js) puts that back before the first paint — a
   rail that flashed open on every page before folding itself away would be
   worse than not remembering at all.

   A page can also ask the rail to stand aside — the credits do, their roll
   wanting the window. That is the page asking rather than the reader, so it
   slides away in front of them rather than arriving gone, and it is not
   written down: leave the credits and the rail is however you had it.

   None of this runs on a phone, where the same element is already a bar with a
   drawer hanging off it. Styles are the `min-width: 901px` block in
   site/styles.css. */

import { $, typing, track } from './dom.js';
import { onOverlay } from './overlay.js';
import { travel } from './pill.js';

const OFF_KEY = 'side-off';

const root = document.documentElement;
const label = (off) => (off ? 'Show sidebar' : 'Hide sidebar');

/**
 * Shut the rail on a page's behalf. A live binding, standing in for the real
 * one until initSidebar() runs — which app.js does long before any page that
 * calls this.
 */
export let standAside = () => {};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Full, or storage is blocked. The rail still opens and shuts; it just
    // forgets which it was.
  }
};

export function initSidebar() {
  const side = $('#side');
  if (!side) return;

  const wide = matchMedia('(min-width: 901px)');
  let peeking = false;
  let easing = 0;

  const shut = () => root.classList.contains('side-off');

  /** The page moving over, or out from under, the rail — once. */
  function easeOnce() {
    root.classList.add('side-anim');
    clearTimeout(easing);
    easing = setTimeout(() => root.classList.remove('side-anim'), 260);
  }

  // `byReader` is false when a page shut the rail rather than a person: that
  // is the page's own presentation and not an answer to remember, and counting
  // it would be counting the credits as a reader who hides the rail.
  function setShut(off, byReader = true) {
    if (off === shut()) return;
    unpeek();
    root.classList.toggle('side-off', off);
    trigger.setAttribute('aria-expanded', String(!off));
    trigger.setAttribute('aria-label', label(off));
    trigger.dataset.tip = label(off);
    easeOnce();
    if (!byReader) return;
    write(OFF_KEY, off ? '1' : '0');
    track('sidebar_toggle', { state: off ? 'closed' : 'open' });
  }

  // After a frame has been drawn, or there is nothing to slide away from: the
  // module runs before the first paint, and a rail shut in that gap is a rail
  // the browser never drew open.
  standAside = () => {
    if (!wide.matches) return;
    requestAnimationFrame(() => requestAnimationFrame(() => setShut(true, false)));
  };

  function peek() {
    if (peeking || !shut() || !wide.matches) return;
    // A peek is not a modal — it holds no scroll and takes no focus — so it
    // does not get to shut one. It only ever gives way to them.
    if (document.body.classList.contains('palette-open')) return;
    peeking = true;
    root.classList.add('side-peek');
  }

  function unpeek() {
    if (!peeking) return;
    peeking = false;
    root.classList.remove('side-peek');
  }

  // The strip standing in for the rail once it is gone, and the button that
  // sends it there. Built here rather than written into the markup: neither
  // does anything without this file, and the markup they would sit in is
  // written out ~416,000 times.
  const edge = button('side-edge', 'Show sidebar');
  edge.dataset.tip = 'Show sidebar';
  edge.dataset.key = '[';
  document.body.append(edge);
  const trigger = button('side-btn', label(shut()));
  trigger.dataset.tip = label(shut());
  trigger.dataset.key = '[';
  trigger.setAttribute('aria-expanded', String(!shut()));
  trigger.append(icon('ic-panel'));
  // In the page, not in the rail. A button that slides away with the thing it
  // toggles can only ever turn it off, which is why there had to be a second
  // control down the window edge to turn it back on. One control in a fixed
  // place answers both ways.
  ($('.inset') || document.body).append(trigger);

  trigger.addEventListener('click', () => setShut(!shut()));

  // Resting on the strip reads the rail; pressing it keeps the rail. Once the
  // rail is over the page the pointer is on the rail rather than the strip, so
  // it is the rail that decides when the reader has finished looking.
  edge.addEventListener('pointerenter', peek);
  edge.addEventListener('focus', peek);
  edge.addEventListener('click', () => setShut(false));
  side.addEventListener('pointerenter', peek);
  side.addEventListener('pointerleave', unpeek);

  // A peek ends at anything saying the reader has moved on, the way the search
  // palette and the shortcut list do.
  onOverlay(unpeek);
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#side, .side-edge')) unpeek();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      unpeek();
      return;
    }
    if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    if (!wide.matches) return;
    e.preventDefault();
    setShut(!shut());
  });

  const nav = $('#nav', side);
  fadeEdges(nav);
  travel(nav, {
    rows: '.nav-item, .nav-sub',
    home: ['.nav-item.active, .nav-sub.active', '.nav-item.here'],
  });
}

/**
 * Which way there is more list. A rail whose sections run past its bottom edge
 * looks exactly like one that ends there, so the end that continues fades into
 * the rail instead of stopping at it.
 */
function fadeEdges(nav) {
  if (!nav) return;
  const mark = () => {
    const over = [];
    if (nav.scrollTop > 2) over.push('top');
    if (nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2) over.push('bottom');
    nav.dataset.over = over.join(' ');
  };
  nav.addEventListener('scroll', mark, { passive: true });
  // Opening a section changes how much list there is without scrolling it.
  for (const sec of nav.querySelectorAll('.nav-sec')) sec.addEventListener('toggle', mark);
  addEventListener('resize', mark, { passive: true });
  mark();
}

function button(cls, label) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = cls;
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-controls', 'side');
  return el;
}

function icon(cls) {
  const el = document.createElement('i');
  el.className = `ic ${cls}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}
