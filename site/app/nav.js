/* The rail: a column of sections beside the page, a drawer on a phone, and
   the button back to the top of a long one. */

import { $, track } from './dom.js';
import { onScroll, scrollTop, scrollToY } from './scroll.js';

export function initNav() {
  const menuBtn = $('#menuBtn');
  const setNavOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
    if (open) document.documentElement.classList.remove('top-hidden');
  };
  menuBtn?.addEventListener('click', () => setNavOpen(!document.body.classList.contains('nav-open')));
  document.addEventListener('click', (e) => {
    if (e.target.closest('#nav') || e.target.closest('#menuBtn')) return;
    if (document.body.classList.contains('nav-open')) setNavOpen(false);
  });
  $('#nav')?.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) track('nav_click', { link_text: a.textContent.trim().slice(0, 40), link_url: a.href.slice(0, 200) });
  });
  $('a.brand')?.addEventListener('click', () => track('brand_click', { link_location: 'rail' }));
  rememberSections();
  hideOnScroll();
}

/** Where the open sections are kept, as { "classes/": true, "globals/": false }. */
const SECTIONS_KEY = 'nav-sections';

/**
 * Which sections of the rail are open, across pages.
 *
 * A page arrives with the section holding it open and every other one closed
 * (navTree() in src/generate/html.js). That is a guess about what a reader
 * wants, so it only stands until they say otherwise: a section they opened by
 * hand stays open on pages that have nothing to do with it, and one they shut
 * stays shut even on its own. Only sections they have actually touched are
 * written down, so the guess still covers the rest.
 *
 * At most one can be open — the sections share a `name` — so restoring the last
 * remembered section shuts the rest, and their toggles record that.
 */
function rememberSections() {
  const secs = document.querySelectorAll('.nav-sec');
  if (!secs.length) return;

  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(SECTIONS_KEY)) || {};
  } catch {
    // Unreadable or unavailable; this page just does not remember.
    saved = {};
  }

  for (const sec of secs) {
    const key = sec.dataset.sec;
    if (typeof saved[key] === 'boolean') sec.open = saved[key];
    sec.addEventListener('toggle', () => {
      saved[key] = sec.open;
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(saved));
      } catch {
        // Full, or storage is blocked. The rail still opens and closes.
      }
    });
  }
}

/** Headroom, and the way back to the top.

    On a phone the rail is folded into a bar standing over the page, and a bar
    that stays there is a bar in the way: it hides on the way down and comes
    back on the way up. The page bar slides with it, and the contents and files
    columns read --h-top / --h-bar and follow. On a wider window the rail is
    beside the page rather than over it, so there is nothing to get out of the
    way of and only the button is left to do. */
function hideOnScroll() {
  const side = $('.side');
  if (!side) return;

  const phone = matchMedia('(max-width: 900px)');
  const bar = $('.pagebar');
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.dataset.tip = 'Back to top';
  const ic = document.createElement('i');
  ic.className = 'ic ic-chev';
  ic.setAttribute('aria-hidden', 'true');
  toTop.append(ic);
  toTop.addEventListener('click', () => {
    toTop.blur();
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToY(0, instant ? 'auto' : 'smooth');
  });
  document.body.append(toTop);

  const slack = 16;
  // The height the rail folds into on a phone: both how far the page has to
  // have moved for hiding it to mean anything, and for the way back to be a
  // trip worth offering.
  const barHeight = 56;
  let lastY = scrollTop();
  let ticking = false;
  let navigatingToc = false;

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.toc a')) return;
    navigatingToc = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      navigatingToc = false;
      lastY = scrollTop();
    }));
  });

  const pinned = () =>
    document.body.classList.contains('nav-open') ||
    side.contains(document.activeElement) ||
    bar?.contains(document.activeElement) ||
    bar?.classList.contains('open') ||
    $('#verMenu')?.hidden === false;

  const update = () => {
    const y = scrollTop();
    const dy = y - lastY;
    lastY = y;
    const showBtn = y >= barHeight;
    toTop.classList.toggle('on', showBtn);
    if (!showBtn && document.activeElement === toTop) toTop.blur();
    if (!phone.matches) {
      document.documentElement.classList.remove('top-hidden');
      return;
    }
    if (navigatingToc || $('.mm-track.grabbing')) return;
    if (y < barHeight || pinned() || dy < -slack) {
      document.documentElement.classList.remove('top-hidden');
    } else if (dy > slack) {
      document.documentElement.classList.add('top-hidden');
    }
  };

  onScroll(() => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  });
  update();
}
