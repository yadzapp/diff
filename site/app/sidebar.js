/* The rail's full and icon-only widths.

   Collapsing leaves one column of icons beside the page. Hovering or focusing
   that column reveals the full rail over the page; it does not reflow the page
   or change the saved preference.

   What is remembered is whether the rail is collapsed, and the script in <head>
   (layout() in src/generate/html.js) puts that back before the first paint — a
   rail that flashed open on every page before collapsing would be
   worse than not remembering at all.

   A page can also ask the rail to stand aside — the credits do, their roll
   wanting the window. That is the page asking rather than the reader, so it
   collapses in front of them rather than arriving compact, and it is not
   written down: leave the credits and the rail is however you had it.

   None of this runs on a phone, where the same element is already a bar with a
   drawer hanging off it. Styles are the `min-width: 901px` block in
   site/styles.css. */

import { $, typing, track } from './dom.js';
import { onOverlay } from './overlay.js';
import { travel } from './pill.js';

const OFF_KEY = 'side-off';

const root = document.documentElement;
const label = (off) => (off ? 'Expand sidebar' : 'Collapse sidebar');

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
    // Full, or storage is blocked. The rail still expands and collapses; it just
    // forgets which it was.
  }
};

export function initSidebar() {
  const side = $('#side');
  if (!side) return;

  const wide = matchMedia('(min-width: 901px)');
  let peeking = false;
  let easing = 0;
  let pills = null;
  let relayouting = 0;

  const shut = () => root.classList.contains('side-off');

  /** The page moving over, or out from under, the rail — once. */
  function easeOnce() {
    root.classList.add('side-anim');
    clearTimeout(easing);
    easing = setTimeout(() => root.classList.remove('side-anim'), 260);
  }

  // Compact ↔ full changes row widths without a window resize; the resting
  // highlight has to be asked to measure again or it keeps the last size.
  function relayout() {
    const run = () => pills?.remeasure();
    requestAnimationFrame(run);
    clearTimeout(relayouting);
    // After the width transition, so the pill matches the settled rows.
    relayouting = setTimeout(run, 260);
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
    relayout();
    if (!byReader) return;
    write(OFF_KEY, off ? '1' : '0');
    track('sidebar_toggle', { state: off ? 'closed' : 'open' });
  }

  // After a frame has been drawn, so a page-requested collapse is still seen.
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
    relayout();
  }

  function unpeek() {
    if (!peeking) return;
    peeking = false;
    root.classList.remove('side-peek');
    relayout();
  }

  // Built here rather than written into the markup: it does nothing without
  // this file, and the markup is written out ~416,000 times.
  const trigger = button('side-btn', label(shut()));
  trigger.dataset.tip = label(shut());
  trigger.dataset.key = '[';
  trigger.setAttribute('aria-expanded', String(!shut()));
  trigger.append(icon('ic-panel'));
  ($('.side-head', side) || side).append(trigger);

  trigger.addEventListener('click', () => setShut(!shut()));

  side.addEventListener('pointerenter', peek);
  side.addEventListener('pointerleave', () => {
    if (!side.contains(document.activeElement)) unpeek();
  });
  side.addEventListener('focusin', peek);
  side.addEventListener('focusout', (e) => {
    if (!side.contains(e.relatedTarget)) unpeek();
  });

  // A peek ends at anything saying the reader has moved on, the way the search
  // palette and the shortcut list do.
  onOverlay(unpeek);
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#side')) unpeek();
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
  pills = travel(nav, {
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
