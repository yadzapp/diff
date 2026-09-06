/* Which DayZ build this page is, and the switcher for moving between them.

   Pages are byte-identical across builds so dist/ can hard-link them, which
   means the build number, date and version are deliberately absent from the
   HTML. Everything here recovers them from the URL and /assets/versions.json
   and stamps them back into the chrome. */

import { $, ROOT, VPATH, fmtDate, pathBuild, pageType, track } from './dom.js';
import { travel } from './pill.js';
import { tag } from './tag.js';

let pagesMapPromise;

/** Which archived pages differ from the latest build's copy. Empty at the
    site root, where every page is the latest copy by definition.
    `null` when pages.json is missing (dev server never writes it). */
export const loadPagesMap = () => {
  if (!pathBuild) return Promise.resolve({});
  return (pagesMapPromise ||= fetch(`/v/${pathBuild}/pages.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null));
};

let buildsPromise;
const loadBuilds = () => (buildsPromise ||= fetch(ROOT + 'assets/versions.json').then((r) => r.json()));

/** "1.29 Update 1" from the oldest of that version, then Update 2, … */
function nameBuilds(builds) {
  const count = Object.create(null);
  const seen = Object.create(null);
  for (const b of builds) count[b.version] = (count[b.version] || 0) + 1;
  for (const b of builds) {
    const n = (seen[b.version] = (seen[b.version] || 0) + 1);
    b.name = `${b.version} Update ${count[b.version] - n + 1}`;
  }
  return builds;
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
  if (label) label.textContent = current.name;
  const button = $('#verBtn');
  if (button) {
    button.title = `DayZ ${current.name} · build ${current.build}`;
    button.setAttribute('aria-label', button.title);
  }
  const gh = $('#ghSrc');
  if (gh && current.sha) gh.href = gh.href.replace('/blob/main/', `/blob/${current.sha}/`);
}

/**
 * The build list, named, with `current` set and the chrome stamped. Every
 * feature that needs to know which build this is awaits this one promise, so
 * versions.json is fetched once however many of them are on the page.
 */
export function identity() {
  return (identityPromise ||= loadBuilds().then((builds) => {
    if (Array.isArray(builds)) nameBuilds(builds);
    current = (pathBuild && builds.find((b) => b.label === pathBuild || b.build === pathBuild)) || builds[0];
    try { sessionStorage.setItem(`build-name:${pathBuild || 'latest'}`, current.name); } catch {}
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
    const vs = typeVsLatest(hist);
    const stale = (map != null && VPATH in map)
      || vs?.kind === 'gone'
      || (map == null && vs?.kind === 'changed');
    if (!stale) return;
    const main = $('.main');
    const heading = main && $('h1', main);
    if (!heading || $('#stalePage')) return;
    const gone = vs?.kind === 'gone';
    const what = pageType?.kind === 'enum' ? 'enum' : pageType?.kind === 'class' ? 'class' : 'page';
    const removed = gone ? builds[vs.idx] : null;
    const bar = document.createElement('p');
    bar.id = 'stalePage';
    bar.className = gone ? 'doc-removed stale-banner' : 'doc-note stale-banner';
    const link = document.createElement('a');
    link.href = ROOT + VPATH + location.hash;
    link.textContent = 'View latest';
    link.addEventListener('click', () => track('view_latest', { from_build: pathBuild, gone }));
    bar.append(
      tag(gone ? 'Removed' : 'Archive', { kind: gone ? 'removed' : 'note' }),
      document.createTextNode(
        gone
          ? ` This ${what} was removed in ${removed?.name || 'a later build'}. `
          : ` This ${what} differs from the latest. `,
      ),
      link,
      document.createTextNode('.'),
    );
    heading.before(bar);
  }).catch(() => {});
}

/** { kind, idx? } | null — events newer than the build being viewed. */
function typeVsLatest(hist) {
  if (!pageType || !hist?.builds || !current) return null;
  const raw = hist[pageType.kind]?.[pageType.name];
  if (raw == null) return null;
  const rec = typeof raw === 'number'
    ? { added: raw, members: {} }
    : { added: raw[0], members: raw[1] || {}, removed: raw[2] };
  const here = hist.builds.indexOf(current.build);
  if (here < 0) return null;
  const after = (i) => i != null && i < here;
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
    let html = '';
    let version = '';
    builds.forEach((b, i) => {
      if (b.version !== version) {
        version = b.version;
        // On the heading, not on the row under it. "Latest" is a fact about the
        // game version — 1.29 is where the game is now — and the builds listed
        // beneath are its updates. On a row it also cost that one row a column
        // the rows around it did not have, which put its date out of line with
        // every other date in the menu.
        html += `<div class="ver-group">DayZ ${version}` +
          (i === 0 ? '<span class="ver-latest">latest</span>' : '') +
          '</div>';
      }
      const cur = b.build === current?.build;
      const href = ROOT + (i === 0 ? '' : `v/${b.label}/`) + VPATH;
      html += `<a href="${href}"${cur ? ' class="cur" aria-current="page"' : ''} title="${b.build}">` +
        `<span class="ver-row"><span class="ver-name">${b.name}</span>` +
        `<span class="ver-date">${fmtDate(b.date)}</span></span>` +
        '</a>';
    });
    verMenu.innerHTML = html;
  }

  // The same two lit shapes the rail has: the build being read keeps its own,
  // and a second one travels to whatever is being considered instead. Nothing
  // to measure until the menu is filled and showing, so it is told then.
  const lit = travel(verMenu, { rows: 'a', home: ['a.cur'] });
  const updateFade = () => {
    verMenu.classList.toggle('at-end', verMenu.scrollTop + verMenu.clientHeight >= verMenu.scrollHeight - 1);
  };
  verMenu.addEventListener('scroll', updateFade, { passive: true });

  function closeVerMenu() {
    verMenu.hidden = true;
    verBtn.setAttribute('aria-expanded', 'false');
    // The pointer left with the menu, so the travelling shape does too — it
    // must not be waiting on last time's row when the menu opens again.
    lit?.rove(null);
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
    lit?.remeasure();
  });
  verMenu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (location.hash) a.href += location.hash; // keep deep links across builds
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
