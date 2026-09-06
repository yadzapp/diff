// HTML building blocks: page layout, type linkification, signature and doc
// rendering. Pure template-literal functions, no dependencies.

import { parseDoc } from '../parser/docparse.js';
import { SITE_URL, ANALYTICS_ID, POSTHOG_KEY } from './content.js';

// Analytics, carried over from the Doxygen site so its numbers continue rather
// than restart. Loaded async and last, after the script the page actually
// needs, so it cannot delay anything: nothing here waits on it and it touches
// nothing on the page.
const GA = ANALYTICS_ID
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ANALYTICS_ID}');</script>`
  : '';

const POSTHOG = POSTHOG_KEY
  ? `<script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="al ol ll init Il Rl Tl Ml Ol za El Dl Sl capture getExtension Pl nl Hl calculateEventProperties Bl register register_once register_for_session unregister unregister_for_session Vl Cl zl getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Gl identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset Zl shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Ul ql createPersonProfile setInternalOrTestUser Wl ul hl opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing $l debug Ua Jn getPageViewId captureTraceFeedback captureTraceMetric bl".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
    })
</script>`
  : '';

const ANALYTICS = GA + POSTHOG;

// One pass instead of four, and none at all for the majority of strings that
// contain nothing to escape. Worth the noise because file pages run whole
// source files through this.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const NEEDS_ESCAPE = /[&<>"]/;

export function esc(s) {
  const str = String(s);
  return NEEDS_ESCAPE.test(str) ? str.replace(/[&<>"]/g, (c) => ESCAPES[c]) : str;
}

/** Attributes every link that leaves the site carries. */
export const EXT = 'target="_blank" rel="noopener"';

/** A heading's anchor, so a section of a long page can be linked to. */
export function slug(title) {
  return title.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
}

export function typeUrl(name, kind) {
  if (kind === 'class') return `classes/${name}/`;
  if (kind === 'enum') return `enum/${name}/`;
  if (kind === 'typedef') return `globals/typedefs/#${name}`;
  return null;
}

/** Linkify known type names inside a type string like "ref map<Foo, int>". */
export function linkType(typeStr, site, base) {
  if (!typeStr) return '';
  return esc(typeStr).replace(/[A-Za-z_]\w*/g, (word) => {
    const kind = site.typeIndex.get(word);
    if (!kind) return word;
    return `<a href="${base}${typeUrl(word, kind)}">${word}</a>`;
  });
}

export function conditionSlug(cond) {
  const name = cond.startsWith('!') ? cond.slice(1) : cond;
  return [...name]
    .map((c) => /[A-Za-z0-9_-]/.test(c) ? c : `~${c.codePointAt(0).toString(16)}~`)
    .join('');
}

export function condBadges(cond, base) {
  if (!cond || !cond.length) return '';
  return cond
    .map((c) => {
      const neg = c.startsWith('!');
      const name = neg ? c.slice(1) : c;
      const tip = `Only when ${name} is ${neg ? 'NOT ' : ''}defined`;
      return `<a class="badge badge-cond" href="${base}conditions/${conditionSlug(c)}/#${neg ? 'not-defined' : 'defined'}" data-tip="${esc(tip)}">${esc(c)}</a>`;
    })
    .join('');
}

export function modBadges(mods, extra = []) {
  const all = [...(mods || []), ...extra];
  if (!all.length) return '';
  return all.map((m) => `<span class="badge badge-mod">${esc(m)}</span>`).join('');
}

/** Render a method signature with linked types. */
export function methodSig(m, site, base, { compact = false } = {}) {
  const mods = (m.mods || []).map((x) => `<span class="kw">${esc(x)}</span> `).join('');
  const ret = m.ret ? `${linkType(m.ret, site, base)} ` : '';
  const params = (m.params || [])
    .map((p) => {
      const pm = (p.mods || []).map((x) => `<span class="kw">${esc(x)}</span> `).join('');
      const def = p.def !== undefined ? ` = <span class="lit">${esc(p.def)}</span>` : '';
      const arr = p.array !== undefined ? `[${esc(p.array)}]` : '';
      const nm = p.name ? ` <span class="pn">${esc(p.name)}</span>` : '';
      return `${pm}${linkType(p.type, site, base)}${nm}${arr}${def}`;
    })
    .join(', ');
  const name = `<span class="fn">${esc(m.name)}</span>`;
  if (compact) return `${name}(${params})`;
  return `${mods}${ret}${name}(${params})`;
}

/** Render a variable/constant signature with linked types. */
export function varSig(v, site, base) {
  const mods = (v.mods || []).map((x) => `<span class="kw">${esc(x)}</span> `).join('');
  const arr = v.array !== undefined ? `[${esc(v.array)}]` : '';
  const init = v.init !== undefined ? ` = <span class="lit">${esc(v.init)}</span>` : '';
  const type = v.type ? `${linkType(v.type, site, base)} ` : '';
  return `${mods}${type}<span class="vn">${esc(v.name)}</span>${arr}${init}`;
}

/** Inline doc text formatting: \p word, backtick-less code refs, links. */
function inlineDoc(text, site, base) {
  let html = esc(text);
  html = html.replace(/[\\@]p\s+(\S+)/g, (_, w) => `<code>${w}</code>`);
  html = html.replace(/[\\@]b\s+(\S+)/g, (_, w) => `<strong>${w}</strong>`);
  html = html.replace(/[\\@]n\b/g, '<br>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, `<a href="$2" ${EXT}>$1</a>`);
  html = html.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, `<a href="$1" ${EXT}>$1</a>`);
  // Link types in text nodes only — not inside href or already-built tags.
  // Doxygen `%Word` means "this word, unlinked"; strip the % after.
  if (site) {
    html = html.replace(/(<[^>]+>)|([^<]+)/g, (all, tag, text) => {
      if (tag) return tag;
      return text.replace(/(?<!%)\b([A-Z]\w{2,})\b/g, (word) => {
        const kind = site.typeIndex.get(word);
        return kind ? `<a href="${base}${typeUrl(word, kind)}">${word}</a>` : word;
      });
    });
  }
  html = html.replace(/%([A-Za-z_]\w*)/g, '$1');
  return html;
}

const TABLE_ROW = /^\s*\|/;
const TABLE_SEP = /^\s*\|[\s:|-]*---/;

function mdCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (s[i] === '|') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += s[i];
    }
  }
  cells.push(cur.trim());
  return cells;
}

function atTable(lines, i) {
  if (!TABLE_ROW.test(lines[i] || '')) return false;
  for (let j = i; j < Math.min(lines.length, i + 6); j++) {
    if (TABLE_SEP.test(lines[j])) return true;
  }
  return false;
}

function takeTable(lines, start, site, base) {
  const rows = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (TABLE_ROW.test(line)) {
      rows.push(line.trim());
      i++;
      continue;
    }
    if (rows.length) {
      rows[rows.length - 1] += ' ' + line.trim();
      i++;
      continue;
    }
    break;
  }
  const parsed = rows
    .filter((r) => !TABLE_SEP.test(r))
    .map((r) => mdCells(r).map((c) => inlineDoc(c, site, base)));
  if (!parsed.length) return { html: '', next: i };
  const [head, ...body] = parsed;
  const th = `<tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const tr = body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return {
    html: `<table class="list doc-table"><thead>${th}</thead><tbody>${tr}</tbody></table>`,
    next: i,
  };
}

function paragraphs(text, site, base) {
  const lines = text.split('\n');
  const out = [];
  const prose = [];
  const flush = () => {
    const t = prose.join('\n').trim();
    if (t) out.push(`<p>${inlineDoc(t, site, base).replaceAll('\n', ' ')}</p>`);
    prose.length = 0;
  };
  for (let i = 0; i < lines.length;) {
    if (atTable(lines, i)) {
      flush();
      const taken = takeTable(lines, i, site, base);
      if (taken.html) out.push(taken.html);
      i = taken.next;
      continue;
    }
    if (!lines[i].trim()) {
      flush();
      i++;
      continue;
    }
    prose.push(lines[i]);
    i++;
  }
  flush();
  return out.join('\n');
}

/** Render a raw doc comment into rich HTML. */
export function renderDoc(rawDoc, site, base) {
  const d = parseDoc(rawDoc);
  if (!d) return '';
  let html = '';
  if (d.deprecated) html += `<div class="doc-warning"><span class="note-tag">Warning</span><strong>Deprecated.</strong> ${inlineDoc(d.deprecated, site, base)}</div>`;
  if (d.brief) html += `<p class="doc-brief">${inlineDoc(d.brief, site, base)}</p>`;
  if (d.desc) html += paragraphs(d.desc, site, base);
  if (d.params?.length) {
    html += '<dl class="doc-params">';
    for (const p of d.params) {
      const dir = p.dir ? `<span class="badge badge-mod">${esc(p.dir)}</span> ` : '';
      html += `<dt>${dir}<code>${esc(p.name)}</code></dt><dd>${inlineDoc(p.text || '', site, base)}</dd>`;
    }
    html += '</dl>';
  }
  if (d.returns) html += `<p class="doc-returns"><strong>Returns:</strong> ${inlineDoc(d.returns, site, base)}</p>`;
  for (const n of d.notes || []) html += `<div class="doc-note"><span class="note-tag">Note</span>${inlineDoc(n, site, base)}</div>`;
  for (const w of d.warnings || []) html += `<div class="doc-warning"><span class="note-tag">Warning</span>${inlineDoc(w, site, base)}</div>`;
  for (const c of d.code || []) html += `<pre class="code" data-hl><code>${esc(c)}</code></pre>`;
  if (d.see?.length) {
    html += `<p class="doc-see"><strong>See also:</strong> ${d.see.map((s) => inlineDoc(s, site, base)).join(', ')}</p>`;
  }
  return html;
}

/** Just the brief line (for tables/index rows). */
export function briefOf(rawDoc, site, base) {
  const d = parseDoc(rawDoc);
  if (!d?.brief) return '';
  return inlineDoc(d.brief, site, base);
}

// The rail, as a tree: a section, and the ways of cutting it under that.
// Labels are the DayZ names (Topics, Classes) rather than Doxygen's C-mode
// ones (Modules, Data Structures). Order is how a DayZ scripter looks — a
// class or a file first, engine topic groups after — and then the pages about
// the site rather than about the game, which is where a reader stops looking.
//
// The kinds used to live on the page bar, one strip per section, which meant a
// reader could only see the cuts for the section they had already chosen. Here
// they are branches, and a section with branches is a disclosure rather than a
// link: its own page is the All at the top of it, the way that tab strip
// opened. Sections with nothing under them stay plain links.
const NAV = [
  ['', 'Welcome'],
  ['classes/', 'Classes', [
    ['classes/', 'All'],
    ['classes/hierarchy/', 'Hierarchy'],
    ['classes/members/', 'Members'],
    ['classes/methods/', 'Methods'],
    ['classes/fields/', 'Fields'],
  ]],
  // The five compiled modules the game loads in order, which is architecture
  // rather than filing: see render/guides.js, which names the same five. The
  // tree at /files/ carries every root it actually finds, this carries the
  // ones that are part of how the scripts are built.
  ['files/', 'Files', [
    ['files/', 'All'],
    ['files/1_Core/', '1_Core'],
    ['files/2_GameLib/', '2_GameLib'],
    ['files/3_Game/', '3_Game'],
    ['files/4_World/', '4_World'],
    ['files/5_Mission/', '5_Mission'],
  ]],
  ['globals/', 'Globals', [
    ['globals/', 'All'],
    ['globals/functions/', 'Functions'],
    ['globals/constants/', 'Constants'],
    ['globals/typedefs/', 'Typedefs'],
    ['globals/enums/', 'Enums'],
    ['globals/values/', 'Values'],
    ['globals/macros/', 'Macros'],
  ]],
  // The topics a scripter reaches for, not the 84 the sources declare — the
  // tree at /topics/ is the whole list, this is a way in to the large ones.
  // Unlike the five layers above, nothing makes these the right eight: they
  // are the biggest groups that are about a subject rather than a table of
  // ids, which is why Emote ids and MenuID are not here despite being among
  // the largest of all.
  // Judged on what is on the topic's own page, not on the count beside it in
  // the tree, which is recursive: World read as a large topic there and is a
  // single link to WorldCommon in fact. System and Debug are the two hubs
  // worth a row, since what they lead to — the file, gamepad, keyboard and
  // mouse APIs, and the two debug drawing APIs — is what a reader was after
  // when they thought of the word.
  // These are also the only entries here whose paths come from the sources
  // rather than from this generator, so a renamed \defgroup would leave a
  // dead row on every page — which is what the nav-resolves test below is
  // watching for.
  ['topics/', 'Topics', [
    ['topics/', 'All'],
    ['topics/Enforce/', 'Enforce script'],
    ['topics/Widget/', 'Widget UI'],
    ['topics/Tools/', 'Tools'],
    ['topics/Math/', 'Math'],
    ['topics/Physics/', 'Physics'],
    ['topics/System/', 'System'],
    ['topics/Debug/', 'Debug'],
  ]],
  ['changelog/', 'Changelog', [
    ['changelog/', 'Changes'],
    ['changelog/release-notes/', 'Release notes'],
    ['changelog/deprecated/', 'Deprecated'],
  ]],
  ['guides/', 'Guides'],
  // About the site rather than about the game, and last in the list for it.
  // GitHub and Discord used to sit under them as two marks; both are named on
  // /about/, and the rail was the second place on the page saying so.
  ['community/', 'Community'],
  ['credits/', 'Credits'],
  ['about/', 'About'],
];

/**
 * Whether this entry owns `active`: its own path or anything under it.
 *
 * Welcome is the empty path, and every path starts with the empty one, so it
 * is the one entry that has to match exactly or it would hold the whole site.
 */
const navHolds = (href, active) =>
  href === '' ? active === '' : Boolean(active) && (href === active || active.startsWith(href));

/**
 * The rail's entries. `active` is the version-relative directory of the page.
 *
 * The deepest entry that holds the page is the one marked, and it is the only
 * one: a reader on /globals/enums/ is on Enums, not on Enums and All both, and
 * two `aria-current` in one list tells a screen reader nothing. The section
 * around it gets `here`, which names the branch without claiming to be the
 * page, and arrives open so the mark inside it can be seen — every other
 * section is closed, and site/app/nav.js remembers what a reader changes.
 *
 * The sections share a `name`, so the browser keeps at most one of them open:
 * opening a branch shuts the one before it, and the rail stays a screenful.
 */
function navTree(nodes, active, base) {
  const link = (cls, href, label, on, top) =>
    `<a class="${cls}${on ? ' active' : ''}" href="${`${base}${href}` || './'}"${top ? ` data-sec="${href}"` : ''}${on ? ' aria-current="page"' : ''}>${esc(label)}</a>`;

  return nodes
    .map(([href, label, kids]) => {
      // A top row carries its own path whether it opens or goes somewhere: the
      // sections below need it to be remembered by, and styles.css hangs the
      // row's shape off it. The kinds inside a section do not have one — they
      // are told apart by their word.
      if (!kids) return link('nav-item', href, label, navHolds(href, active), true);
      // Longest match wins. Every kind under a section also sits under that
      // section's own All, and the kind is the more particular answer.
      const [kid] = kids
        .filter(([k]) => navHolds(k, active))
        .sort((a, b) => b[0].length - a[0].length);
      const sub = kids.map(([k, kl]) => link('nav-sub', k, kl, kid?.[0] === k)).join('');
      return `<details class="nav-sec" name="nav-sec" data-sec="${href}"${kid ? ' open' : ''}><summary class="nav-item${kid ? ' here' : ''}">${esc(label)}</summary><div class="nav-kids">${sub}</div></details>`;
    })
    .join('');
}

// The search palette's category tabs, over the kind letters KIND in
// site/app/search-index.js gives each entry. Doxygen offered the same choice
// from the magnifier beside its search field, and it is what makes a common
// word usable: "Get" matches thousands of methods, and the only way to see
// the four classes called that is to ask for classes.
const SEARCH_FILTERS = [
  ['', 'All'],
  ['c', 'Classes'],
  ['m', 'Methods'],
  ['v', 'Fields'],
  ['eV', 'Enums'],
  ['fkt', 'Globals'],
  ['d', 'Macros'],
  ['F', 'Files'],
  ['g', 'Topics'],
]
  .map(([kinds, label], i) =>
    `<button type="button" class="pf${i ? '' : ' active'}" data-kinds="${kinds}" aria-pressed="${!i}">${label}</button>`)
  .join('');

/**
 * Tokens layout() interpolates when building the archive shell. They cannot
 * appear in a real page, and they pass through esc() unchanged.
 */
export const ARCHIVE_MARK = { title: '§T§', desc: '§D§', base: '§B§', vpath: '§P§', bar: '§R§', aside: '§A§', inner: '§C§' };

export const SITE_TITLE = 'DIFF, DayZ Internal File Finder by YADZ';

/** Last packed inner produced by layout(), for the generator's _b store. */
export let lastPacked = '';

/** A class's own page (or its inherited-members list), not the Classes indexes. */
function isClassLeaf(vpath) {
  const m = /^classes\/([^/]+)\/(members\/)?$/.exec(vpath);
  return Boolean(m && m[1] !== 'index' && m[1] !== 'fields' && !/^[a-z_]$/.test(m[1]));
}

/** Kind a leaf URL sits under, so /classes/Foo/ titles as "Foo · Class · …". */
function titleKind(vpath) {
  if (isClassLeaf(vpath)) return 'Class';
  if (vpath.startsWith('enum/')) return 'Enum';
  if (vpath.startsWith('files/') && vpath !== 'files/') return 'File';
  if (vpath.startsWith('topics/') && vpath !== 'topics/') return 'Topic';
  if (vpath.startsWith('guides/') && vpath !== 'guides/') return 'Guide';
  return '';
}

export function pageMeta(o) {
  const parts = [];
  if (o.title) parts.push(o.title);
  const kind = titleKind(o.versionPath || '');
  if (kind) parts.push(kind);
  parts.push(SITE_TITLE);
  return {
    title: parts.join(' · '),
    description: o.description || SITE_TITLE,
    base: o.base,
    vpath: o.versionPath || '',
    // Where the page is, unless it says otherwise. The rail matches by prefix,
    // so a page that hands over its own path lands on the deepest row that
    // holds it and needs to name nothing — /files/4_World/ was passing "files/"
    // and landing on All, which is a page telling the rail it is somewhere it
    // is not. Only pages that genuinely sit under a different heading than
    // their path, such as an enum under Globals, still say so.
    active: o.active ?? o.versionPath ?? '',
    // The page bar spans the window, so it is chrome rather than body and
    // sits outside <main>. It still differs from page to page, so an
    // archived build has to carry it: it travels in the meta line beside the
    // title, and layout() leaves a mark for it in the shell.
    bar: o.bar || '',
    // A column standing beside the body rather than inside it, and so outside
    // <main> for the same reason the bar is. It travels the same way.
    aside: o.aside || '',
  };
}

/**
 * The contents of `<main>`: breadcrumbs and body. Archived builds store this
 * instead of a full document so the layout chrome is not paid per body.
 */
export function pageInner(o) {
  const trail = o.breadcrumbs?.length > 1 ? o.breadcrumbs.slice(0, -1) : [];
  const crumbs = trail.length
    ? `<nav class="crumbs" aria-label="Breadcrumb">${trail
        .map((c) => (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`))
        .join('<span class="crumb-sep">/</span>')}</nav>`
    : '';
  const close = '</h1>';
  const titleAt = o.content.indexOf(close);
  return crumbs && titleAt !== -1
    ? `${o.content.slice(0, titleAt + close.length)}\n${crumbs}${o.content.slice(titleAt + close.length)}`
    : `${crumbs}${o.content}`;
}

/**
 * Full page layout.
 * opts: { title, base, active, bar, aside, breadcrumbs, content, description, versionPath }
 *  - base: relative prefix from this page to the VERSION root (e.g. "../../")
 *  - aside: a column standing beside <main> in the shell (the files tree)
 *  - active: the nav entry this page sits under, as a version-relative dir
 *  - bar: the page's secondary bar, from pageBar() in render/pagebar.js. It
 *    sits above <main> and outside it, so it spans everything beside the
 *    rail; the archive carries it in the meta line rather than in the body.
 *  - versionPath: path of this page relative to version root (for the switcher)
 *
 * Deliberately carries no build, version or date, and links to assets by
 * absolute path rather than a relative site root. That makes a page's bytes
 * depend only on its content, so identical pages across builds can be
 * stored once. The build stamp is restored client-side by site/app/builds.js
 * from the URL. See test/render.test.js.
 *
 * This is the page chrome every page wears — the head, the rail (brand, search,
 * nav, build, theme), the search palette — so it is where to edit any of them.
 * There is no page footer: the rail already names About, Community, Credits,
 * GitHub and Discord, and the license notice a footer would carry is the Legal
 * section of /about/.
 * The body beside them comes from a renderer in src/generate/render/.
 */
export function layout(o) {
  const meta = pageMeta(o);
  const inner = pageInner(o);
  lastPacked = `${JSON.stringify(meta)}\n${inner}`;
  const desc = meta.description;
  const nav = navTree(
    o.development ? NAV : NAV.filter(([href]) => href !== 'guides/'),
    meta.active,
    o.base
  );
  const url = `${SITE_URL}/${o.versionPath || ''}`;
  const social = o.noindex
    ? '<meta name="robots" content="noindex">'
    : `<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DIFF">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">`;

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(desc)}">
${social}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="DayZ builds" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
<script>try{const r=document.documentElement,t=localStorage.getItem('theme');if(t)r.dataset.theme=t;if(localStorage.getItem('side-off')==='1')r.classList.add('side-off')}catch(e){}</script>
</head>
<body data-base="${o.base}" data-vpath="${esc(o.versionPath || '')}"${o.development ? ' data-development' : ''}>
<script>try{const v=document.body.dataset.vpath;if(v){const b=location.pathname.match(/^\\/v\\/[^/]+\\//);const w=(b?b[0]:'/')+v;if(decodeURIComponent(location.pathname)!==w)history.replaceState(null,'',w+location.search+location.hash)}}catch(e){}</script>
<div class="side" id="side">
<button class="menu-btn" id="menuBtn" aria-label="Menu" aria-controls="nav" aria-expanded="false"><i class="ic ic-menu"></i></button>
<div class="side-head">
<a class="brand" href="/">DIFF</a>
<button class="search-trigger" id="searchBtn" aria-label="Search"><i class="ic ic-search"></i><span>Search</span><kbd id="searchKbd">⌘K</kbd></button>
</div>
<nav class="nav" id="nav" aria-label="Site">${nav}</nav>
<div class="side-set">
<div class="verpicker">
<button class="ver-btn" id="verBtn" aria-haspopup="true" aria-expanded="false" title="Switch DayZ build" data-tip="Change build"><span class="ver-label"></span><i class="ic ic-chev"></i></button>
<nav class="ver-menu" id="verMenu" aria-label="DayZ builds" hidden></nav>
</div>
<button class="theme-btn" id="themeBtn" aria-label="Toggle theme" data-tip="Toggle theme" data-key="M"><i class="ic ic-theme"></i></button>
</div>
</div>
<script>try{const b=location.pathname.match(/^\\/v\\/([^/]+)\\//)?.[1]||'latest';const n=sessionStorage.getItem('build-name:'+b);if(n)document.querySelector('.ver-label').textContent=n}catch(e){}</script>
<div class="inset">${o.bar || ''}
<div class="shell">${o.aside || ''}
<main class="main">${inner}</main>
</div>
</div>
<div class="palette" id="palette" hidden>
<div class="palette-box" role="dialog" aria-modal="true" aria-label="Search">
<div class="palette-field">
<i class="ic ic-search"></i>
<input id="search" type="search" placeholder="Search names, docs and notes…" autocomplete="off" spellcheck="false" aria-label="Search">
<kbd>Esc</kbd>
</div>
<div id="searchFilters" class="palette-filters">${SEARCH_FILTERS}</div>
<div id="searchResults" class="search-results" hidden></div>
<div class="palette-hints"><kbd>↑</kbd><kbd>↓</kbd> to navigate · <kbd>↵</kbd> to open · type <code>Class.member</code> to scope</div>
</div>
</div>
<script type="module" src="/assets/app.js"></script>
${o.script ? `<script src="/assets/${o.script}" defer></script>` : ''}
${ANALYTICS}
</body>
</html>`;
}
