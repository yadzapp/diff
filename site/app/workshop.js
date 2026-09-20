/* Steam Workshop cards on /community/. The items are fetched when the page
   opens; the HTML is only the empty list. Card clicks on home / community /
   about / guides are tracked here too. */

import { $, esc, VPATH, track } from './dom.js';

const WORKSHOP = 'https://steamcommunity.com/app/221100/workshop/';
const STORE = 'https://store.steampowered.com/app/221100/DayZ/';
const COLLECTIONS = 'https://steamcommunity.com/workshop/browse/?appid=221100&section=collections';

const fmt = (n) => Number(n).toLocaleString('de-DE');
const card = (it) => `<a class="card card-ext relative block cursor-pointer px-4 py-3.5 border border-line rounded-2xl text-fg transition-[border-color] duration-150 hover:border-accent2 hover:no-underline" href="${esc(it.url)}" target="_blank" rel="noopener">
  <i class="ic ic-ext" aria-hidden="true"></i>
  <h3 class="m-0 mb-1 text-accent pr-6">${esc(it.title)}</h3>
  <p class="m-0 text-fg2 text-sm">${it.subscriptions ? `${esc(fmt(it.subscriptions))} subscribers` : 'Steam Workshop'}</p>
</a>`;
const stat = (n, label, href) =>
  `<a class="stat flex flex-col items-center flex-[1_1_108px] px-4 py-5 border border-line rounded-2xl text-fg hover:border-accent2 hover:no-underline" href="${esc(href)}" target="_blank" rel="noopener"><strong class="text-xl text-accent">${esc(fmt(n))}</strong><span class="text-sm text-fg2">${esc(label)}</span></a>`;

const fromCatalog = (catalog) => ({
  items: (catalog.mods || []).map((m) => ({
    title: m.name,
    url: m.url,
    subscriptions: m.subscriptions,
  })),
});

function sectionOf(el) {
  if (el.closest('#workshop-list, #workshop-stats')) return 'workshop';
  let s = el.closest('.cards, .stats, p, pre, .videos') || el;
  while (s && !s.classList?.contains('main')) {
    if (s.matches?.('h2[id]')) return s.id;
    s = s.previousElementSibling || s.parentElement;
  }
  return '';
}

const cardPage = () => {
  if (VPATH === 'community/') return 'community';
  if (VPATH === 'about/') return 'about';
  if (VPATH === 'guides/') return 'guides';
  if (VPATH === '') return 'home';
  return null;
};

/** Home / community / about / guides card grids (and community outbound links). */
export function initCards() {
  const page = cardPage();
  if (!page) return;
  $('.main')?.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const inGrid = a.closest('.cards, .stats, #workshop-list, #workshop-stats');
    if (!inGrid && !(page === 'community' && a.target === '_blank')) return;
    const label = (
      a.matches('.card') ? a.querySelector('h3')?.textContent
      : a.matches('.stat') ? a.querySelector('span')?.textContent || a.textContent
      : a.textContent
      || ''
    ).replace(/\s+/g, ' ').trim();
    track('click_card', {
      page,
      link_label: label.slice(0, 100),
      link_url: a.href.slice(0, 200),
      link_section: sectionOf(a),
    });
  });
}

export function initWorkshop() {
  const box = $('#workshop-list');
  if (!box) return;
  const stats = $('#workshop-stats');
  const paint = (data) => {
    if (!data.items?.length) throw new Error();
    if (stats) {
      const html = [
        data.players ? stat(data.players, 'playing now', STORE) : '',
        data.total ? stat(data.total, 'workshop items', WORKSHOP) : '',
        data.collections ? stat(data.collections, 'collections', COLLECTIONS) : '',
      ].join('');
      if (html) {
        stats.hidden = false;
        stats.innerHTML = html;
      }
    }
    box.setAttribute('aria-busy', 'false');
    box.className = 'cards grid gap-6 grid-cols-[repeat(auto-fit,minmax(230px,1fr))] lg:grid-cols-3';
    box.innerHTML = data.items.map(card).join('');
  };
  const load = (url, map) =>
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => paint(map ? map(data) : data));

  load('/api/workshop').catch(() =>
    load('/assets/workshop.json', fromCatalog).catch(() => {
      box.setAttribute('aria-busy', 'false');
      box.className = 'muted text-fg2';
      box.textContent = 'Workshop items could not be loaded. Try reloading the page.';
    }),
  );
}
