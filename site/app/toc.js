/* Table of contents.

   Doxygen's page-nav panel: the sections of this page, beside it, with the
   one you are in marked. Built from the headings the page already has, so
   it costs the generated HTML nothing and cannot fall out of step with it.
   Wide viewports only — there is no room for a third column below that, and
   the headings are a short scroll away on a phone.

   All or nothing, same as the sidebar: a fixed button in the inset's top-right
   and `]` put the panel away, remembered across pages. */

import { $, VPATH, track, typing } from './dom.js';
import { iconButton } from './icon-button.js';
import { onScroll, scrollToY, viewTop } from './scroll.js';

const OFF_KEY = 'toc-off';
const root = document.documentElement;
const label = (off) => (off ? 'Show contents' : 'Hide contents');

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Full, or storage is blocked. The panel still opens and shuts.
  }
};

const storedOff = () => {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
};

/* Set by buildToc. A no-op on every page that has no contents panel. */
let refresh = () => {};

/** Re-mark the panel after something on the page was hidden or shown. */
export const refreshToc = () => refresh();

function buildToc(main) {
  if ($('.toc')) return;
  // Direct children, plus h2/h3 living in a class-page <details> summary —
  // those sections are still top-level page structure, just foldable.
  const heads = [...main.children].flatMap((el) => {
    if (el.tagName === 'H2' || el.tagName === 'H3') return [el];
    if (el.matches?.('details.member-sec')) {
      const h = el.querySelector(':scope > summary > h2, :scope > summary > h3');
      return h ? [h] : [];
    }
    return [];
  });
  if (heads.length < 3) return;

  const toc = document.createElement('aside');
  toc.id = 'toc';
  toc.className = 'toc sticky top-2 right-2 rounded-xl self-start flex-none w-[200px] max-h-[calc(100vh-var(--inset)*2-var(--h-top)-var(--h-bar))] ml-auto py-4 px-4 overflow-y-auto bg-bg2 transition-[top,max-height] duration-[var(--dur-ui)] ease-[var(--ease-ui)] motion-reduce:transition-none max-[1179px]:hidden';
  toc.setAttribute('aria-label', 'On this page');
  const nav = document.createElement('nav');
  nav.className = 'flex flex-col gap-px';

  const link =
    'block py-1 px-2 border-l-2 border-transparent text-fg2 text-xs leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap hover:text-fg hover:no-underline [&.cur]:text-accent [&.cur]:border-l-accent2 [&.cur]:font-semibold';

  // Clear the hash and park at the page start — same job as the floating
  // button, but beside the section links that dirtied the URL.
  const top = document.createElement('a');
  top.href = location.pathname + location.search;
  top.className = `toc-1 mb-1 ${link}`;
  top.textContent = 'Start';
  top.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    track('toc_click', { toc_target: 'start' });
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
      dispatchEvent(new Event('hashchange'));
    }
    scrollToY(0, 'auto');
  });
  nav.append(top);

  const links = heads.map((h) => {
    // Most headings are anchored already; the rest are given one here rather
    // than in the generator, where it would be an id nothing links to.
    if (!h.id) h.id = (h.textContent.trim().toLowerCase().match(/[\w]+/g) || ['section']).join('-');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.className = h.tagName === 'H3' ? `toc-3 pl-[18px] ${link}` : `toc-2 ${link}`;
    // not the count badge: the number is on the heading itself already
    const heading = h.cloneNode(true);
    heading.querySelectorAll('.count, .heading-anchor').forEach((el) => el.remove());
    a.textContent = heading.textContent.trim();
    a.addEventListener('click', () => track('toc_click', { toc_target: a.textContent.slice(0, 80) }));
    nav.append(a);
    return a;
  });
  toc.append(Object.assign(document.createElement('p'), { className: 'toc-title text-xs font-semibold text-fg2 uppercase tracking-wider mb-2 mt-0', textContent: 'On this page' }), nav);
  main.after(toc);

  const off = () => root.classList.contains('toc-off');
  const trigger = iconButton({
    icon: 'toc',
    className: 'toc-btn',
    tip: label(storedOff()),
    key: ']',
  });
  trigger.setAttribute('aria-controls', 'toc');
  trigger.setAttribute('aria-expanded', String(!storedOff()));
  // In the inset, not in the panel — a button that leaves with the thing it
  // toggles can only ever turn it off.
  ($('.inset') || document.body).append(trigger);

  function setOff(next, byReader = true) {
    if (next === off()) return;
    root.classList.toggle('toc-off', next);
    trigger.setAttribute('aria-expanded', String(!next));
    trigger.setAttribute('aria-label', label(next));
    trigger.dataset.tip = label(next);
    if (!byReader) return;
    write(OFF_KEY, next ? '1' : '0');
    track('toc_toggle', { state: next ? 'closed' : 'open' });
  }

  if (storedOff()) setOff(true, false);
  trigger.addEventListener('click', () => setOff(!off()));

  const wide = matchMedia('(min-width: 1180px)');
  document.addEventListener('keydown', (e) => {
    if (e.key !== ']' || e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    if (!wide.matches || toc.hidden) return;
    e.preventDefault();
    setOff(!off());
  });

  const margins = heads.map((h) => parseFloat(getComputedStyle(h).marginTop) || 0);

  /** Last heading whose section has reached the sticky chrome — the header,
      and the page bar under it where there is one. Count the heading's top
      margin: that gap is this section, not the previous one, and a TOC click
      parks the heading on scroll-padding-top, which sat below the old
      heading-box threshold. Headings are measured against the window, so the
      line has to be too: where the scrolled content starts, plus the chrome
      standing over it. Above the first section, Start is current. */
  const spy = () => {
    let cur = null;
    const css = getComputedStyle(document.documentElement);
    const px = (name, fallback) => parseFloat(css.getPropertyValue(name)) || fallback;
    const line = viewTop() + px('--h-top', 56) + px('--h-bar', 0);
    for (let i = 0; i < heads.length; i++) {
      if (heads[i].hidden) continue;
      if (heads[i].getBoundingClientRect().top - margins[i] > line) break;
      cur = links[i];
    }
    top.classList.toggle('cur', !cur);
    for (const a of links) a.classList.toggle('cur', a === cur);
  };
  onScroll(spy);

  refresh = () => {
    let any = false;
    heads.forEach((h, i) => {
      links[i].hidden = h.hidden;
      if (!h.hidden) any = true;
    });
    toc.hidden = !any;
    trigger.hidden = !any;
    spy();
  };
  refresh();
}

export function initToc() {
  if (VPATH === 'credits/') return;
  const main = $('.main');
  if (!main) return;

  // Permalink icon inside a foldable section heading must not toggle <details>.
  main.addEventListener('click', (e) => {
    if (e.target.closest('.member-sec > summary a')) e.stopPropagation();
  });
  // Foldable Methods / Variables / … sections on class pages.
  let revealOpen = false;
  main.addEventListener('toggle', (e) => {
    if (revealOpen) return;
    const sec = e.target.closest?.('details.member-sec');
    if (!sec || e.target !== sec) return;
    const heading = $('summary > h2, summary > h3', sec);
    const label = heading?.cloneNode(true);
    label?.querySelectorAll('.count, .heading-anchor').forEach((el) => el.remove());
    track('member_section_toggle', {
      section: (label?.textContent || '').trim().slice(0, 80),
      open: sec.open,
    });
  }, true);
  // Deep links into a member (or the section id) open a collapsed section.
  const reveal = () => {
    const id = location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    const sec = el?.closest?.('details.member-sec');
    if (!sec || sec.open) return;
    revealOpen = true;
    sec.open = true;
    revealOpen = false;
  };
  reveal();
  window.addEventListener('hashchange', reveal);

  const roomForToc = matchMedia('(min-width: 1180px)');
  roomForToc.addEventListener('change', () => roomForToc.matches && buildToc(main));
  if (roomForToc.matches) buildToc(main);
}
