/* The rail's width, and getting it out of the way.

   Two hundred and forty pixels is a guess, and it is wrong in both directions:
   a 13" laptop reading a 6,000-line source file wants them back, and a wide
   monitor has room for the whole of "5_Mission" without the label wrapping. So
   the edge is draggable between 160 and 360, and past the low end — or on a
   click, or on `[` — the rail goes away entirely and the page takes the width.

   Shut is shut: there is no icon-only version of it. An icon rail looks tidy
   and reads as a row of ambiguous glyphs you have to hover one at a time, and
   the things in this one are words — "Globals", "Hierarchy", "5_Mission" —
   that a picture cannot stand in for. What is left instead is a strip down the
   edge of the window: resting on it brings the rail back over the page to be
   read, and pressing it brings the rail back for good. A peek is looking
   rather than opening, so nothing reflows under it and nothing is remembered.

   What is remembered is the width and whether the rail is shut, and the script
   in <head> (layout() in src/generate/html.js) puts both back before the first
   paint — a rail that flashed open on every page before folding itself away
   would be worse than not remembering at all.

   None of this runs on a phone, where the same element is already a bar with a
   drawer hanging off it. Styles are the `min-width: 901px` block in
   site/styles.css. */

import { $, typing, track } from './dom.js';
import { onOverlay } from './overlay.js';

const WIDTH_KEY = 'side-w';
const OFF_KEY = 'side-off';

/** What a drag is allowed to set, matching --w-side-min/max in the CSS. */
const MIN = 160;
const MAX = 360;
const DEFAULT = 240;

/** How far below the minimum a drag has to go before it means "shut it". */
const GIVE = 32;

const root = document.documentElement;
const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n)));
const label = (off) => (off ? 'Show the sidebar' : 'Hide the sidebar');

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Full, or storage is blocked. The rail still moves; it just forgets.
  }
};

export function initSidebar() {
  const side = $('#side');
  if (!side) return;

  const wide = matchMedia('(min-width: 901px)');
  let width = stored();
  let peeking = false;
  let easing = 0;

  const shut = () => root.classList.contains('side-off');

  function stored() {
    try {
      const w = Number(localStorage.getItem(WIDTH_KEY));
      return w ? clamp(w) : DEFAULT;
    } catch {
      return DEFAULT;
    }
  }

  /** Move the rail's own edge. `keep` is false while a drag is still running. */
  function setWidth(w, keep) {
    width = clamp(w);
    root.style.setProperty('--w-side-set', `${width}px`);
    if (keep) write(WIDTH_KEY, String(width));
  }

  /** The page moving over, or out from under, the rail — once. */
  function easeOnce() {
    root.classList.add('side-anim');
    clearTimeout(easing);
    easing = setTimeout(() => root.classList.remove('side-anim'), 260);
  }

  function setShut(off) {
    if (off === shut()) return;
    unpeek();
    root.classList.toggle('side-off', off);
    trigger.setAttribute('aria-expanded', String(!off));
    trigger.setAttribute('aria-label', label(off));
    trigger.dataset.tip = label(off);
    write(OFF_KEY, off ? '1' : '0');
    easeOnce();
    track('sidebar_toggle', { state: off ? 'closed' : 'open' });
  }

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

  // The rail's own edge, the strip standing in for it once it is gone, and the
  // button that sends it there. Built here rather than written into the
  // markup: none of the three does anything without this file, and the markup
  // they would sit in is written out ~416,000 times.
  const rail = button('side-rail', 'Resize the sidebar');
  rail.dataset.tip = 'Drag to resize · click to hide';
  // As tall as the window, so its middle is nowhere near the pointer.
  rail.dataset.tipFollow = '';
  side.append(rail);
  const edge = button('side-edge', 'Show the sidebar');
  edge.dataset.tip = 'Show the sidebar';
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

  dragRail(rail, { setWidth, setShut, shut, width: () => width });
  const nav = $('#nav', side);
  fadeEdges(nav);
  travel(nav);
}

/**
 * Two lit shapes for the whole list, rather than one per row.
 *
 * One rests on the page being read and stays there. The other travels to
 * whatever the pointer or the keyboard is on and leaves with it. They are
 * separate because they are separate claims: where you are does not stop being
 * true while you consider going somewhere else, and a single shape that slid
 * away on hover took the answer with it.
 *
 * They never share a row. Point at the page you are already on and the
 * travelling one gets out of the way, because lighting a row twice says
 * nothing the resting shape has not already said.
 *
 * Each is measured off the row it is going to, so it takes that row's indent
 * and height and a nested row is not the same size as a section heading.
 * Measuring means offsets, so anything that moves the rows — a section
 * opening, the window resizing, the rail being dragged narrower — has to say
 * so.
 *
 * Marking the list is what turns the per-row backgrounds in the stylesheet
 * off, so a rail with no script running keeps a plain hover and a plain
 * current page instead of losing both.
 */
function travel(nav) {
  if (!nav) return;
  const make = (cls) => {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    nav.prepend(el);
    return el;
  };
  const resting = make('nav-pill home');
  const roving = make('nav-pill');
  nav.classList.add('travels');

  /**
   * Whether a row is on screen to be sat on.
   *
   * Not offsetParent, and not a client rect either. A shut <details> hides its
   * contents with content-visibility rather than display in current browsers,
   * and a subtree skipped that way still answers every offset and rect it had
   * when it was last laid out — so the shape would take a position inside a
   * section that is not showing and strand itself over whatever row happens to
   * be there. checkVisibility is the one test that reads it as hidden; where
   * it is missing, so is content-visibility, and display:none is what shut
   * means.
   */
  const shown = (el) => (el ? (el.checkVisibility?.() ?? !!el.offsetParent) : false);

  /**
   * Where it rests. The page being read, and failing that the section holding
   * it — a shut section is standing in for the page inside it, and marking it
   * is the only way the rail can say which page you are on without being
   * opened first.
   */
  const home = () => {
    const on = $('.nav-item.active, .nav-sub.active', nav);
    if (shown(on)) return on;
    const sec = $('.nav-item.here', nav);
    return shown(sec) ? sec : null;
  };

  const on = new Map();

  const put = (pill, row) => {
    if (on.get(pill) === row) return;
    on.set(pill, row);
    if (!shown(row)) {
      pill.classList.remove('on');
      return;
    }
    pill.style.transform = `translate(${row.offsetLeft}px, ${row.offsetTop}px)`;
    pill.style.width = `${row.offsetWidth}px`;
    pill.style.height = `${row.offsetHeight}px`;
    pill.classList.add('on');
  };

  /** Point at the page you are already on and the travelling shape stands down. */
  const rove = (row) => put(roving, row === home() ? null : row);
  const rest = () => put(resting, home());
  /** After anything that moved the rows: put both back where they now belong. */
  const remeasure = () => {
    const was = on.get(roving);
    on.clear();
    rest();
    if (was) rove(was);
  };

  nav.addEventListener('pointerover', (e) => {
    const row = e.target.closest?.('.nav-item, .nav-sub');
    if (row) rove(row);
  });
  nav.addEventListener('pointerleave', () => rove(null));
  nav.addEventListener('focusin', (e) => {
    const row = e.target.closest?.('.nav-item, .nav-sub');
    if (row) rove(row);
  });
  nav.addEventListener('focusout', (e) => {
    if (!nav.contains(e.relatedTarget)) rove(null);
  });
  // <details> does not bubble its toggle, so this has to go down to meet it.
  nav.addEventListener('toggle', remeasure, true);
  addEventListener('resize', remeasure);

  rest();
  // Placed before either is allowed to move, or their first appearance is a
  // slide in from the top left corner. A frame later the web font has settled.
  requestAnimationFrame(() => {
    remeasure();
    resting.classList.add('set');
    roving.classList.add('set');
  });
}

/**
 * Dragging the edge. The width follows the pointer directly rather than going
 * back through storage on every move, so a fast drag keeps up; the value is
 * only written down when the pointer is let go.
 *
 * Let go past the low end and the rail shuts, which is the same gesture as
 * pushing a drawer closed — and the width it had before that drag is what
 * comes back with it, not the sliver it was dragged down to. A press that
 * never moved is a click, and a click shuts it too.
 */
function dragRail(rail, side) {
  let from = 0;
  let moved = false;
  let dragged = false;

  const onMove = (e) => {
    if (!moved && Math.abs(e.clientX - from) < 3) return;
    moved = true;
    side.setWidth(e.clientX, false);
  };

  const onUp = (e) => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    root.classList.remove('side-drag');
    if (!moved) return; // a press that stayed put; the click below has it
    // The click that follows this pointerup ends the same gesture and would
    // read as a second answer to it.
    dragged = true;
    setTimeout(() => { dragged = false; });
    if (e.clientX < MIN - GIVE) {
      side.setWidth(from, true);
      side.setShut(true);
    } else {
      side.setWidth(e.clientX, true);
    }
  };

  rail.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault();
    from = side.width();
    moved = false;
    root.classList.add('side-drag');
    // On the document rather than on the handle: a drag that outruns the
    // pointer, or leaves the window, still has to end when the button does.
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });

  rail.addEventListener('click', () => {
    if (!dragged) side.setShut(!side.shut());
  });

  // The same edge from the keyboard, since a drag is not one.
  rail.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowLeft' ? -16 : e.key === 'ArrowRight' ? 16 : 0;
    if (!step) return;
    e.preventDefault();
    side.setWidth(side.width() + step, true);
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
