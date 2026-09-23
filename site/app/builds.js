/* Which DayZ build this page is, and the switcher for moving between them.

   Pages are byte-identical across builds so dist/ can hard-link them, which
   means the build number, date and version are deliberately absent from the
   HTML. Everything here recovers them from the URL and /assets/versions.json
   and stamps them back into the chrome. */

import { $, ROOT, VPATH, fmtDate, pathBuild, pageType, track } from './dom.js';
import { banner } from './banner.js';

let pagesMapPromise;

/** Which archived pages differ from the latest build's copy. Empty at the
    site root, where every page is the latest copy by definition.
    `null` when pages.json is missing (dev server never writes it).
    Prefers the sessionStorage copy archive.js already warmed, so the banner
    does not re-download and re-parse hundreds of KB on every archive page. */
export const loadPagesMap = () => {
  if (!pathBuild) return Promise.resolve({});
  return (pagesMapPromise ||= (async () => {
    try {
      const cached = sessionStorage.getItem(`pages:${pathBuild}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    try {
      const r = await fetch(`/v/${pathBuild}/pages.json`);
      if (!r.ok) return null;
      const map = await r.json();
      try {
        if (map && Object.keys(map).length) {
          sessionStorage.setItem(`pages:${pathBuild}`, JSON.stringify(map));
        }
      } catch {}
      return map;
    } catch {
      return null;
    }
  })());
};

let buildsPromise;
const loadBuilds = () => (buildsPromise ||= fetch(ROOT + 'assets/versions.json').then((r) => r.json()));

/** Names come from /assets/versions.json, already stable-only for stables.
 *  A build with no name keeps its build number. */
function nameBuilds(builds) {
  for (const b of builds) b.name ||= b.build;
  return builds;
}

/** First non-experimental entry — the live PC stable at the site root. */
export function liveBuild(builds) {
  return builds.find((b) => !b.channel) || builds[0];
}

/* The build being viewed. A live binding rather than a getter, so the modules
   that read it after awaiting identity() see what it was set to. */
export let current = null;

let identityPromise = null;

/**
 * Write the build onto the page. The label is chrome and wants it once; the
 * GitHub link belongs to the listing, so a page swapped in under this one
 * (site/app/swap.js) has a fresh, unpinned link and has to ask again.
 */
export function stampBuild() {
  if (!current) return;
  const label = $('.ver-label');
  // Build id is the stable label — Bohemia's "Road to Badlands Update N"
  // names restart and collide, so they stay off the chrome.
  if (label) label.textContent = current.build;
  const button = $('#verBtn');
  const exp = current.channel === 'experimental';
  if (button) {
    button.setAttribute('aria-label', exp ? `DayZ ${current.build} · experimental` : `DayZ ${current.build}`);
  }
  const alert = $('#verExp');
  if (alert) alert.hidden = !exp;
  const gh = $('#ghSrc');
  if (gh && current.sha) {
    // Pin to this build's commit; swap the repo when viewing experimental.
    let href = gh.href.replace('/blob/main/', `/blob/${current.sha}/`);
    if (current.channel === 'experimental') {
      href = href.replace('/DayZ-Script-Diff/', '/DayZ-Script-Diff-Experimental/');
    }
    gh.href = href;
  }
}

/**
 * The build list, named, with `current` set and the chrome stamped. Every
 * feature that needs to know which build this is awaits this one promise, so
 * versions.json is fetched once however many of them are on the page.
 */
export function identity() {
  return (identityPromise ||= loadBuilds().then((builds) => {
    if (!Array.isArray(builds)) {
      current = null;
      return builds;
    }
    nameBuilds(builds);
    current = (pathBuild && builds.find((b) => b.label === pathBuild || b.build === pathBuild))
      || liveBuild(builds);
    try { sessionStorage.setItem(`build-name:${pathBuild || 'latest'}`, current.build); } catch {}
    stampBuild();
    return builds;
  }));
}

export const initBuilds = () => { identity(); };

/**
 * On an archived build, if this page's body differs from the latest copy
 * (pages.json), show a banner above the heading linking to the same path at
 * the site root. Identical pages stay quiet — the archive loader is already
 * serving the latest bytes.
 *
 * On the experimental build, show an amber banner pointing at the live stable
 * for class/enum pages and for any page whose body differs from latest.
 * Build-independent pages (about, community, credits, …) stay quiet.
 * A type new in experimental has nothing live to compare, so no link.
 *
 * Dev never writes pages.json, so class/enum pages fall back to history.json:
 * removed or changed after the build being viewed still counts as stale.
 */
export function initStalePage() {
  $('#stalePage')?.remove();
  if (!pathBuild || !VPATH) return;
  return Promise.all([
    loadPagesMap(),
    identity(),
    pageType
      ? fetch(ROOT + 'assets/history.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null),
  ]).then(([map, builds, hist]) => {
    if (!current) return;
    const main = $('.main');
    const heading = main && $('h1', main);
    if (!heading || $('#stalePage')) return;

    if (current.channel === 'experimental') {
      // Identical non-type pages are the same bytes as live — no warning.
      if (!pageType && !(map != null && VPATH in map)) return;
      const vs = typeVsLatest(hist, builds);
      const bornHere = vs?.kind === 'added-here';
      const bar = banner({
        kind: 'exp',
        text: bornHere
          ? `You're viewing an experimental build — this isn't live yet.`
          : `You're viewing an experimental build. `,
        href: bornHere ? undefined : ROOT + VPATH + location.hash,
        link: bornHere ? undefined : 'View latest build',
      });
      bar.id = 'stalePage';
      bar.querySelector('a')?.addEventListener('click', () => track('view_latest', { from_build: pathBuild, experimental: true }));
      heading.before(bar);
      return;
    }

    const vs = typeVsLatest(hist, builds);
    const stale = (map != null && VPATH in map)
      || vs?.kind === 'gone'
      || (map == null && vs?.kind === 'changed');
    if (!stale) return;
    const gone = vs?.kind === 'gone';
    const what = pageType?.kind === 'enum' ? 'enum' : pageType?.kind === 'class' ? 'class' : 'page';
    // vs.idx is into hist.builds (same newest-first order as versions.json).
    const removed = gone
      ? builds.find((b) => b.build === hist.builds[vs.idx]) || builds[vs.idx]
      : null;
    const bar = banner({
      removed: gone,
      text: gone
        ? `This ${what} was removed in ${removed?.build || 'a later build'}. `
        : `This ${what} differs from the latest. `,
      href: ROOT + VPATH + location.hash,
    });
    bar.id = 'stalePage';
    bar.querySelector('a').addEventListener('click', () => track('view_latest', { from_build: pathBuild, gone }));
    heading.before(bar);
  }).catch(() => {});
}

/** { kind, idx? } | null — events newer than the build being viewed.
 *  Experimental (index 0 when present) is ignored for archived stables so a
 *  type only added on experimental does not look "changed" on the live page. */
function typeVsLatest(hist, builds) {
  if (!pageType || !hist?.builds || !current) return null;
  const raw = hist[pageType.kind]?.[pageType.name];
  if (raw == null) return null;
  const rec = typeof raw === 'number'
    ? { added: raw, members: {} }
    : { added: raw[0], members: raw[1] || {}, removed: raw[2] };
  const here = hist.builds.indexOf(current.build);
  if (here < 0) return null;
  const firstStable = builds ? builds.findIndex((b) => !b.channel) : 0;
  const floor = firstStable < 0 ? 0 : firstStable;
  if (current.channel === 'experimental' && rec.added === here) {
    return { kind: 'added-here', idx: here };
  }
  const after = (i) => i != null && i < here && i >= floor;
  if (after(rec.removed)) return { kind: 'gone', idx: rec.removed };
  if (after(rec.added)) return { kind: 'changed' };
  for (const p of Object.values(rec.members)) {
    if (p == null) continue;
    if (typeof p === 'number') {
      if (after(p)) return { kind: 'changed' };
      continue;
    }
    if (after(p[0] < 0 ? null : p[0]) || after(p[1])) return { kind: 'changed' };
  }
  return null;
}

/** A button opening a popover of all builds grouped by game version. */
export function initVersionPicker() {
  const verBtn = $('#verBtn');
  const verMenu = $('#verMenu');
  if (!verBtn) return;

  // Which page the menu was built for: every row is this page in another
  // build, so one swapped in under it (site/app/swap.js) wants it again.
  let filledFor = null;
  async function fillMenu() {
    if (filledFor === VPATH) return;
    filledFor = VPATH;
    const builds = await identity();
    const live = liveBuild(builds);
    // Group by game version. Rows are the build id — Bohemia's marketing
    // names restart and collide, so they are not used here. Pre-release
    // snapshots stay out unless in view.
    const mark = (kind, label) => {
      const tone = kind === 'exp'
        ? 'border-kw text-kw'
        : 'border-accent2 text-accent';
      return `<span class="ver-${kind} ml-auto px-1.5 border rounded-xl text-xs font-semibold leading-4 ${tone}">${label}</span>`;
    };
    const listed = builds.filter((b) => b.name !== b.build || b.build === current?.build);
    let html = '';
    let groupKey = '';
    listed.forEach((b) => {
      const key = b.channel ? `exp:${b.version}` : b.version;
      if (key !== groupKey) {
        groupKey = key;
        const marker = b.channel
          ? mark('exp', 'experimental')
          : (b.build === live?.build ? mark('latest', 'latest') : '');
        html += `<div class="ver-group">${b.version}${marker}</div>`;
      }
      const cur = b.build === current?.build;
      const href = ROOT + (b.build === live?.build ? '' : `v/${b.label}/`) + VPATH;
      html += `<a href="${href}"${cur ? ' class="cur" aria-current="page"' : ''}>` +
        `<span class="ver-row flex items-center gap-2 whitespace-nowrap"><span class="ver-name min-w-0 flex-1 truncate">${b.build}</span>` +
        `<span class="ver-date ml-auto text-fg2 text-xs whitespace-nowrap">${fmtDate(b.date)}</span></span>` +
        '</a>';
    });
    verMenu.innerHTML = html;
  }

  const updateFade = () => {
    verMenu.classList.toggle('at-end', verMenu.scrollTop + verMenu.clientHeight >= verMenu.scrollHeight - 1);
  };
  verMenu.addEventListener('scroll', updateFade, { passive: true });

  function closeVerMenu() {
    verMenu.hidden = true;
    verBtn.setAttribute('aria-expanded', 'false');
  }

  verBtn.addEventListener('click', async () => {
    if (!verMenu.hidden) return closeVerMenu();
    await fillMenu();
    verMenu.hidden = false;
    verBtn.setAttribute('aria-expanded', 'true');
    track('open_version_picker');
    const cur = verMenu.querySelector('.cur');
    if (cur) verMenu.scrollTop = cur.offsetTop - verMenu.clientHeight / 2;
    updateFade();
  });
  verMenu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    // Keep deep links across builds. Mutate the attribute, not a.href — the
    // property is absolute and appending a hash onto it twice corrupts it.
    if (location.hash) {
      const href = a.getAttribute('href');
      if (href && !href.includes('#')) a.setAttribute('href', href + location.hash);
    }
    if (a.classList.contains('cur')) return;
    track('switch_build', { build: /\/v\/([^/]+)\//.exec(a.getAttribute('href'))?.[1] || 'latest' });
  });
  verBtn.parentElement.addEventListener('keydown', (e) => {
    if (verMenu.hidden) return;
    if (e.key === 'Escape') {
      closeVerMenu();
      verBtn.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const links = [...verMenu.querySelectorAll('a')];
      const i = links.indexOf(document.activeElement);
      const next = i === -1 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links[next]?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!verMenu.hidden && !e.target.closest('.verpicker')) closeVerMenu();
  });
}
