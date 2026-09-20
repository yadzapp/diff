// The pieces more than one page renderer needs: how a name becomes an anchor,
// how a script path becomes a URL, and the two cross-reference blocks that
// hang off every documented declaration.
//
// Page bodies themselves live one file per page beside this one; see the
// "Where is the HTML?" section of CONTRIBUTING.md.

import { esc, EXT } from '../html.js';
import { FORUM_THREADS, RELEASE_NOTES, VERSION_TITLES } from '../content.js';

export function anchorFor(used, name) {
  let a = name.replace(/[^\w]/g, '_');
  if (used.has(a)) {
    let i = 2;
    while (used.has(`${a}-${i}`)) i++;
    a = `${a}-${i}`;
  }
  used.add(a);
  return a;
}

/**
 * How a script path is spelled, for the reader and in its URL alike: the
 * game's own capitalisation, restored from the lowercase spelling the sources
 * we parse use (see src/generate/casing.js).
 */
export function shown(site, path) {
  return site.paths.get(path) || path.replace(/^scripts\//, '');
}

/**
 * A file's URL, spelled the way the game's own tree spells it, which is also
 * the way the page displays it and the way every other kind of page names
 * itself: /files/1_Core/WorkbenchApi.c/ beside /classes/PlayerBase/. The sources
 * we parse lowercase every path, so this goes through src/generate/casing.js
 * to get the capitalisation back; site/notfound.js forwards the lowercase
 * spelling, and any older one, to whatever the current build calls it.
 */
export function fileHref(site, base, path) {
  return `${base}files/${shown(site, path)}/`;
}

export function fileLineHref(site, base, path, line) {
  return `${fileHref(site, base, path)}#L${line}`;
}

/** Source link(s) for a class/enum title: file icon; path:line stays on aria-label. */
export function fileButtons(site, base, locations) {
  if (!locations.length) return '';
  return `<span class="title-actions">${locations
    .map((l) => {
      const label =
        `${shown(site, l.path)}:${l.line}` + (l.forward ? ' (declaration)' : '');
      const tip = l.forward ? 'View declaration' : 'View source';
      return `<a class="icon-btn icon-btn-sm file-btn" href="${fileLineHref(site, base, l.path, l.line)}" data-tip="${tip}" aria-label="${esc(label)}"><i class="ic ic-file" aria-hidden="true"></i></a>`;
    })
    .join('')}</span>`;
}

/** How many callers to show, and the point past which the rest are only
 *  counted. Three fits the median name, which has two callers, so most lists
 *  are complete as shown and the signature above stays the loudest thing in
 *  the block. Listing every caller of `Cast` would cost 4,955 links on each of
 *  the pages naming a Cast and tell nobody anything. */
const CALLERS_SHOWN = 3;
const CALLERS_LISTED = 50;

/** Doxygen's own list joining: ", " between, ", and " before the last
 *  (trWriteList in translator_en.h). */
export function writeList(items) {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')}<span class="xref-sep">, and </span>${items[items.length - 1]}`;
}

function expandableList(items) {
  if (items.length <= CALLERS_SHOWN) return writeList(items);
  const extra = items.length - CALLERS_SHOWN;
  return `${items.slice(0, CALLERS_SHOWN).join(', ')} <details class="xref-more"><summary>Show ${extra} more</summary><span class="xref-more-list"><span class="xref-sep">, </span>${writeList(items.slice(CALLERS_SHOWN))} <button class="xref-less" type="button">Show less</button></span></details>`;
}

/** A name inside a reference list. Doxygen prints the scope only when it is
 *  not the scope of the page you are on, closes every function with "()", and
 *  falls back to plain text when the name will not resolve. */
export function refName(owner, name, scope, base, linked, method = true) {
  const suffix = method ? '()' : '';
  const label = owner && owner !== scope ? `<span class="xref-owner">${esc(owner)}.</span>${esc(name)}${suffix}` : `${esc(name)}${suffix}`;
  if (!linked) return label;
  const anchor = name.replace(/[^\w]/g, '_');
  const href = owner ? `${base}classes/${owner}/#${anchor}` : `${base}globals/functions/#${anchor}`;
  return `<a href="${href}">${label}</a>`;
}

/**
 * Where a name is called from. Only 11% of members carry a doc comment, so for
 * most of this API the way to learn what something does is to read a place it
 * is already used, and this is the index of those places.
 *
 * Receiver types and lexical class scope are resolved where the parsed source
 * carries enough information; globally unique names are the fallback.
 */
export function callersBlock(name, ctx, scope = null, field = false) {
  const { site, base } = ctx;
  if (!ctx.xref) return '';
  const list = (field ? site.fieldCallers : site.callers)?.get(scope ? `${scope}.${name}` : name);
  if (!list?.length) return '';

  const link = (c) => refName(c.owner || null, c.name, scope, base, true);
  const extra = list.length - CALLERS_SHOWN;
  // "and" belongs before the last entry only when the last entry is shown;
  // a truncated head runs on into the "Show N more" that follows it.
  const first = list.slice(0, CALLERS_SHOWN).map(link);
  const head = extra <= 0 ? writeList(first) : first.join(', ');
  const rest =
    extra <= 0
      ? ''
      : list.length <= CALLERS_LISTED
        ? ` <details class="xref-more"><summary>Show ${extra} more</summary><span class="xref-more-list"><span class="xref-sep">, </span>${writeList(list.slice(CALLERS_SHOWN).map(link))} <button class="xref-less" type="button">Show less</button></span></details>`
        : `, <span class="xref-rest">and ${extra.toLocaleString()} more</span>`;
  return /* html */ `<div class="xref mt-1.5 text-xs leading-relaxed text-fg2"><span class="xref-label text-xs uppercase tracking-wider opacity-70" title="Resolved from receiver types and lexical scope; globally unique names are used as a fallback">Referenced by</span> ${head}${rest}</div>`;
}

/**
 * What a body calls, which is Doxygen's "References". Unresolved and ambiguous
 * calls remain plain text.
 */
export function referencesBlock(item, ctx, scope = null) {
  const { site, base } = ctx;
  if (!ctx.xref) return '';
  const items = (site.callResolutions.get(item) || []).map((resolution) => {
    const t = resolution.target;
    if (resolution.ctor) {
      const label = `new ${esc(resolution.name)}()`;
      return t ? `<a href="${base}classes/${t.owner}/">${label}</a>` : label;
    }
    return refName(t?.owner || null, resolution.name, scope, base, Boolean(t));
  });
  for (const ref of site.fieldReferences.get(item) || []) {
    items.push(refName(ref.owner, ref.name, scope, base, true, false));
  }
  if (!items.length) return '';
  return /* html */ `<div class="xref xref-out mt-2 text-xs leading-relaxed text-fg2"><span class="xref-label text-xs uppercase tracking-wider opacity-70">References</span> ${expandableList(items)}</div>`;
}

/**
 * Grid of [label, url, description, extras?] cards. `ext` marks them as
 * leaving. extras is optional [['GitHub', url], ...] so a project site and
 * its repo share one card instead of two.
 */
function extraPrimaryLabel(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'marketplace.visualstudio.com') return 'Marketplace';
    if (u.hostname === 'steamcommunity.com') return 'Workshop';
    if (u.hostname === 'github.com' && u.pathname.includes('/wiki')) return 'Wiki';
    if (u.hostname === 'github.com') return 'GitHub';
  } catch { /* keep Website */ }
  return 'Website';
}

export function linkCards(links, ext = false) {
  return /* html */ `<div class="cards grid gap-6 grid-cols-[repeat(auto-fit,minmax(230px,1fr))] lg:grid-cols-3">
${links.map((link) => linkCard(link, ext)).join('\n')}
</div>`;
}

function linkCard([label, url, desc, extras], ext) {
  const attrs = ext ? ` ${EXT}` : '';
  const icon = ext ? '<i class="ic ic-ext" aria-hidden="true"></i>\n  ' : '';
  const h3Cls = `m-0 mb-1 text-accent${ext ? ' pr-6' : ''}`;
  const body = `<h3 class="${h3Cls}">${esc(label)}</h3>
  <p class="m-0 text-fg2 text-sm">${esc(desc)}</p>`;
  const cardCls = `card block px-4 py-3.5 border border-line rounded-2xl text-fg transition-[border-color] duration-150 hover:border-accent2 hover:no-underline${ext ? ' card-ext relative' : ''}`;
  if (!extras?.length) {
    return `<a class="${cardCls} cursor-pointer" href="${esc(url)}"${attrs}>
  ${icon}${body}
</a>`;
  }
  const links = [[extraPrimaryLabel(url), url], ...extras]
    .map(([name, href]) => `<a class="text-sm" href="${esc(href)}"${attrs}>${esc(name)}</a>`)
    .join('');
  return `<div class="${cardCls}">
  ${icon}${body}
  <div class="card-links flex flex-wrap gap-x-3 gap-y-1 mt-2">${links}</div>
</div>`;
}

export const byName = (a, b) => a.name.localeCompare(b.name);

export function fmtDate(iso, year = 'numeric') {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year, timeZone: 'UTC',
  });
}

function releaseText(value) {
  let html = '';
  let end = 0;
  for (const match of value.matchAll(/https?:\/\/[^\s,)]+|T\d{5,6}\b/g)) {
    html += esc(value.slice(end, match.index));
    const label = match[0];
    const href = label.startsWith('http') ? label : `https://feedback.bistudio.com/${label}`;
    html += `<a href="${esc(href)}" ${EXT}>${esc(label)}</a>`;
    end = match.index + label.length;
  }
  return html + esc(value.slice(end));
}

const buildNo = (build) => Number(build.split('.')[2] || 0);
const versionNo = (version) => {
  const [major, minor] = version.split('.').map(Number);
  return major * 1000 + minor;
};

const stableKnown = new Set([
  ...Object.keys(FORUM_THREADS),
  ...Object.keys(RELEASE_NOTES),
]);
const versionsWithStable = new Set(
  [...stableKnown].map((build) => build.split('.').slice(0, 2).join('.')),
);

/** A script snapshot is experimental when that version already has stable
 *  releases and this build is not one of them. 1.19 has no stable thread on
 *  record, so its script builds stay — they are the stable record we have. */
export function isStableBuild(build) {
  if (stableKnown.has(build)) return true;
  return !versionsWithStable.has(build.split('.').slice(0, 2).join('.'));
}

/** "1.29 Update 1" from the oldest of that version. `builds` is newest-first.
 *  Counts every build it is given; archive paths depend on that. Pass only
 *  stable builds when the number should match Bohemia's Update N. */
export function updateNames(builds) {
  const count = new Map();
  const seen = new Map();
  for (const v of builds) count.set(v.version, (count.get(v.version) || 0) + 1);
  const names = new Map();
  for (const v of builds) {
    const n = (seen.get(v.version) || 0) + 1;
    seen.set(v.version, n);
    names.set(v.build, `${v.version} Update ${count.get(v.version) - n + 1}`);
  }
  return names;
}

/** Shareable archive path segment: "129u3" for 1.29 Update 3. `builds` is newest-first. */
export function archiveLabels(builds) {
  const labels = new Map();
  for (const [build, name] of updateNames(builds)) {
    const m = /^(\d+\.\d+) Update (\d+)$/.exec(name);
    labels.set(build, m ? `${m[1].replaceAll('.', '')}u${m[2]}` : build);
  }
  return labels;
}

/** Stable rows only, newest-first within each version. Experimental script
 *  snapshots are omitted. Forum-only builds still count, so Update N matches
 *  Bohemia even when that build's scripts never reached the repository. */
function releaseGroups(versions) {
  const groups = new Map();
  const rowsFor = (version) => {
    if (!groups.has(version)) groups.set(version, new Map());
    return groups.get(version);
  };

  for (const v of versions) {
    if (!isStableBuild(v.build)) continue;
    rowsFor(v.version).set(v.build, { build: v.build, rev: v.rev, date: v.date });
  }

  for (const [build, thread] of Object.entries(FORUM_THREADS)) {
    const version = build.split('.').slice(0, 2).join('.');
    const rows = rowsFor(version);
    const row = rows.get(build) || { build, date: thread.date };
    row.url = thread.url;
    rows.set(build, row);
  }

  for (const [build, note] of Object.entries(RELEASE_NOTES)) {
    const version = build.split('.').slice(0, 2).join('.');
    const rows = rowsFor(version);
    const row = rows.get(build)
      || [...rows.values()].find((candidate) => candidate.date === note.date && !candidate.note)
      || { build, date: note.date };
    row.note = note;
    row.url ||= note.forumUrl;
    rows.set(row.build, row);
  }

  return groups;
}

/** "1.26 Update 3" for a script build, counting stable releases that have no
 *  scripts. Experimental builds are absent from the map. */
export function stableUpdateNames(versions) {
  const groups = releaseGroups(versions);
  return updateNames(
    [...groups.entries()].flatMap(([version, rows]) => [...rows.values()]
      .sort((a, b) => buildNo(b.build) - buildNo(a.build))
      .map((row) => ({ version, build: row.build }))),
  );
}

/**
 * Official PC stable releases, grouped by game version. Experimental script
 * snapshots are left out, so they don't shift Update N. Forum threads for
 * builds whose scripts never reached the repository still show up.
 *
 * `highlight` marks the build this page was generated for.
 * /release-notes/ does not: those bytes have to stay identical
 * across builds (see layout() in html.js), so no group is left open and docs
 * links are rooted at `/`.
 */
export function renderReleases(ctx, { highlight = true, absolute = false } = {}) {
  const { site, root, versions } = ctx;
  const groups = releaseGroups(versions);
  versions.forEach((v, i) => {
    const row = groups.get(v.version)?.get(v.build);
    if (!row) return;
    row.docs = absolute
      ? (i === 0 ? '/' : `/v/${v.label}/`)
      : (i === 0 ? root : `${root}v/${v.label}/`);
  });
  const names = updateNames(
    [...groups.entries()].flatMap(([version, rows]) => [...rows.values()]
      .sort((a, b) => buildNo(b.build) - buildNo(a.build))
      .map((row) => ({ version, build: row.build }))),
  );
  const openAt = highlight ? site.version : versions[0]?.version;

  return [...groups.entries()]
    .sort((a, b) => versionNo(b[0]) - versionNo(a[0]))
    .map(([version, rows]) => {
      const title = VERSION_TITLES[version] ? ` <span class="muted text-fg2">${esc(VERSION_TITLES[version])}</span>` : '';
      const items = [...rows.values()]
        .sort((a, b) => buildNo(b.build) - buildNo(a.build))
        .map((r) => {
          const note = r.note;
          const indexedName = names.get(r.build) || r.build;
          const noteName = note
            ? note.title.replace(/^Stable\s+/, '').replace(/\s+-\s+Version\b.*$/, '')
            : indexedName;
          const updateLabel = indexedName.match(/Update \d+$/)?.[0];
          const name = note && updateLabel && !noteName.endsWith(updateLabel)
            ? `${noteName} (${updateLabel})`
            : noteName;
          let label;
          if (highlight && r.build === site.build) label = `<strong class="min-w-0 justify-self-start font-semibold" title="${esc(r.build)}">${esc(name)}</strong>`;
          else if (r.docs) label = `<span class="min-w-0 justify-self-start font-semibold" title="${esc(r.build)}">${esc(name)}</span>`;
          else label = `<span class="rbuild min-w-0 justify-self-start font-semibold text-fg2 cursor-help" title="Scripts for this build are not in the Script Diff repository (${esc(r.build)})">${esc(name)}</span>`;
          const metadata = `Build ${r.build}${r.rev ? ` · Scripts Rev. ${r.rev}` : ''}`;
          const forum = r.url
            ? `<a class="release-link inline-flex items-center gap-1.5 whitespace-nowrap font-normal" href="${r.url}" ${EXT}><span>Official forum</span><i class="ic ic-ext size-3.5" aria-hidden="true"></i></a>`
            : '';
          const forumSource = r.url
            ? `<a href="${r.url}" ${EXT}>Official forum</a>`
            : '';
          const head = (extra) => `<span class="release-summary-copy grid flex-1 min-w-0 gap-1">
<span class="release-primary min-w-0 text-base text-fg font-semibold">${label}</span>
<span class="release-meta flex flex-wrap items-center gap-x-2.5 gap-y-1 text-fg2 text-xs"><span class="font-mono">${esc(metadata)}</span>${extra}</span>
</span>
<time class="release-date shrink-0 text-fg2 text-sm font-normal" datetime="${esc(r.date)}">${esc(fmtDate(r.date))}</time>`;
          if (note) {
            const count = note.sections.reduce((total, section) => total + section.items.length, 0);
            const hasNamedAreas = note.sections.some(
              (section) => !section.items.length && section.heading && section.heading !== 'GENERAL GAME',
            );
            let sectionGap = false;
            const sections = note.sections.map((section) => {
              if (section.heading === 'GENERAL GAME' && !section.items.length && !hasNamedAreas) return '';
              const heading = !section.heading
                ? ''
                : section.items.length
                  ? `<h3 class="m-0 mb-2 text-sm">${esc(section.heading)}</h3>`
                  : `<h3 class="flex items-center gap-2.5 m-0 mb-2 text-xs tracking-widest text-accent2">${esc(section.heading)}</h3>`;
              const items = section.items.length
                ? `<ul class="release-note-items list-disc m-0 pl-5">${section.items.map((item) => `<li class="my-1.5 leading-normal">${releaseText(item)}</li>`).join('')}</ul>`
                : '';
              const gap = sectionGap ? ' mt-5' : '';
              sectionGap = true;
              return `<section class="${section.items.length ? 'release-change' : 'release-area'}${gap}">${heading}${items}</section>`;
            }).join('');
            return `<li class="release-item border-t border-line"><details class="release-note min-w-0"${r.build === versions[0]?.build ? ' open' : ''}>
<summary class="flex list-none cursor-pointer items-center gap-1.5 px-4 py-4 font-semibold text-fg">
${head(`<span class="count px-2 py-px rounded-full bg-accent-bg text-accent text-xs font-mono font-normal whitespace-nowrap">${count} change${count === 1 ? '' : 's'}</span>`)}
</summary>
<div class="release-note-body wrap-anywhere mx-4 mb-6 pt-0.5 max-[760px]:mx-4">
${sections}
<p class="release-sources mt-6 text-fg2 text-xs">Sources: <a href="${note.wikiUrl}" ${EXT}>DayZ Wiki</a>${forumSource ? ` and ${forumSource}` : ''}.</p>
</div>
</details></li>`;
          }
          return `<li class="border-t border-line"><div class="release-plain flex items-center gap-1.5 px-4 py-4 font-semibold text-fg">${head(forum)}</div></li>`;
        })
        .join('\n');
      return /* html */ `<details class="my-2 rounded-xl border border-line"${version === openAt ? ' open' : ''}>
<summary class="flex list-none cursor-pointer items-center gap-1.5 px-4 py-3.5 font-semibold">DayZ ${esc(version)}${title} <span class="count ml-auto text-sm font-normal text-fg2">${rows.size} build${rows.size === 1 ? '' : 's'}</span></summary>
<ul class="list-none m-0 p-0 text-sm">
${items}
</ul>
</details>`;
    })
    .join('\n');
}
