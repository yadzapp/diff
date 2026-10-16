// Machine-readable API of one build, for agents rather than the browser.
//
// search.json is a name index: enough to jump to a page, not enough to answer
// "what does SetQuantity take." These files are the signatures, inheritance,
// locations and doc briefs of every declaration, one file per type under
// /api/, so an agent fetches the ~1 KB it needs instead of an 8.5 MB dump
// that no context window holds. /api.json is the index: names and the URL
// pattern of each file. Latest-only — older builds keep the HTML archive —
// and never written into a page. See renderLlmsTxt for the catalog that points
// here, and renderAgentMd for how an agent should look a type up.

import { parseDoc } from '../parser/docparse.js';
import { SITE_URL, DPL_URL as DPL } from './content.js';
import { SITE_TITLE } from './html.js';

const byName = (a, b) => a.name.localeCompare(b.name);

function briefOf(raw) {
  return parseDoc(raw)?.brief || undefined;
}

function shown(site, filePath) {
  if (!filePath) return undefined;
  return site.paths.get(filePath) || filePath.replace(/^scripts\//, '');
}

function loc(site, item) {
  const path = item.file || item.locations?.find((l) => !l.forward)?.path || item.locations?.[0]?.path;
  const line = item.line ?? item.locations?.find((l) => !l.forward)?.line ?? item.locations?.[0]?.line;
  const file = shown(site, path);
  return { file, line };
}

function param(p) {
  const o = {};
  if (p.mods?.length) o.mods = p.mods;
  if (p.type) o.type = p.type;
  if (p.name) o.name = p.name;
  if (p.array !== undefined) o.array = p.array;
  if (p.def !== undefined) o.def = p.def;
  return o;
}

function method(site, m) {
  const { file, line } = loc(site, m);
  const o = { name: m.name };
  if (m.kind) o.kind = m.kind;
  if (m.ret) o.ret = m.ret;
  if (m.params?.length) o.params = m.params.map(param);
  if (m.mods?.length) o.mods = m.mods;
  if (m.proto) o.proto = true;
  if (m.cond?.length) o.cond = m.cond;
  const brief = briefOf(m.doc);
  if (brief) o.brief = brief;
  if (file) o.file = file;
  if (line) o.line = line;
  return o;
}

function field(site, v) {
  const { file, line } = loc(site, v);
  const o = { name: v.name };
  if (v.type) o.type = v.type;
  if (v.mods?.length) o.mods = v.mods;
  if (v.array !== undefined) o.array = v.array;
  if (v.init !== undefined) o.init = v.init;
  if (v.cond?.length) o.cond = v.cond;
  const brief = briefOf(v.doc);
  if (brief) o.brief = brief;
  if (file) o.file = file;
  if (line) o.line = line;
  return o;
}

/** Where a type's file lives, relative to the site root. */
export const apiClassFile = (name) => `api/classes/${name}.json`;
export const apiEnumFile = (name) => `api/enums/${name}.json`;

/** Every file carries the build it describes and the license it is under,
 *  because an agent may fetch one without ever reading the index. */
const stamp = (site, o) => ({ ...o, build: site.build, license: DPL });

export function apiClass(site, c) {
  const { file, line } = loc(site, c);
  const o = { name: c.name, url: `classes/${c.name}/` };
  if (c.generics) o.generics = c.generics;
  if (c.baseName) o.base = c.baseName;
  if (c.bases.length > 1) o.bases = c.bases.map((b) => (b.cond?.length ? { name: b.base, cond: b.cond } : b.base));
  if (c.modded) o.modded = true;
  if (c.mods?.length) o.mods = c.mods;
  if (c.group) o.topic = c.group;
  const brief = briefOf(c.doc);
  if (brief) o.brief = brief;
  if (file) o.file = file;
  if (line) o.line = line;
  if (c.methods.length) o.methods = c.methods.map((m) => method(site, m));
  if (c.members.length) o.members = c.members.map((v) => field(site, v));
  return stamp(site, o);
}

export function apiEnum(site, e) {
  const { file, line } = loc(site, e);
  const o = { name: e.name, url: `enum/${e.name}/` };
  if (e.base) o.base = e.base;
  const brief = briefOf(e.doc);
  if (brief) o.brief = brief;
  if (file) o.file = file;
  if (line) o.line = line;
  o.values = e.values.map((v) => {
    const ev = { name: v.name };
    if (v.value !== undefined) ev.value = v.value;
    const vb = briefOf(v.doc);
    if (vb) ev.brief = vb;
    return ev;
  });
  return stamp(site, o);
}

/** Declarations outside any class: small enough to ship as one file. */
export function apiGlobals(site) {
  const functions = [...site.functions].sort(byName).map((fn) => {
    const o = method(site, fn);
    o.url = `globals/functions/#${fn.name}`;
    return o;
  });

  const constants = [...site.globals].sort(byName).map((g) => {
    const o = field(site, g);
    o.url = `globals/constants/#${g.name}`;
    if (g.group) o.topic = g.group;
    return o;
  });

  const typedefs = [...site.typedefs].sort(byName).map((t) => {
    const { file, line } = loc(site, t);
    const o = { name: t.name, type: t.type, url: `globals/typedefs/#${t.name}` };
    if (t.array !== undefined) o.array = t.array;
    if (file) o.file = file;
    if (line) o.line = line;
    return o;
  });

  const macros = [...site.defines].sort(byName).map((d) => {
    const { file, line } = loc(site, d);
    const o = { name: d.name, url: `globals/macros/#${d.name}` };
    if (d.value) o.value = d.value;
    if (file) o.file = file;
    if (line) o.line = line;
    return o;
  });

  return stamp(site, { functions, constants, typedefs, macros });
}

/** What exists and where to fetch it: names only, so a lookup by name is
 *  one small file away. */
export function apiIndex(site) {
  const topics = [...site.groups.values()]
    .map((g) => {
      const o = { name: g.name, title: g.label, url: `topics/${g.slug}/` };
      if (g.parent) o.parent = g.parent;
      return o;
    })
    .sort(byName);

  return {
    title: SITE_TITLE,
    url: SITE_URL,
    build: site.build,
    version: site.version,
    date: site.date,
    sha: site.sha,
    license: {
      name: 'DayZ Public License (DPL)',
      url: DPL,
      notice:
        'Script sources © BOHEMIA INTERACTIVE a.s. Parsed and reformatted for documentation. Not official documentation and not affiliated with DayZ or Bohemia Interactive.',
    },
    stats: site.stats,
    files: {
      class: apiClassFile('{name}'),
      enum: apiEnumFile('{name}'),
      globals: 'api/globals.json',
    },
    classes: [...site.classes.keys()].sort((a, b) => a.localeCompare(b)),
    enums: [...site.enums.keys()].sort((a, b) => a.localeCompare(b)),
    topics,
  };
}

/** The llmstxt.org index: what to fetch, and the license that covers it. */
export function renderLlmsTxt(site) {
  return `# ${SITE_TITLE}

> The DayZ scripts, browsable: documentation for the DayZ Enforce Script API — every class, method, enum, global and source file — generated from the official DayZ Script Diff sources. Latest PC stable build: ${site.build}.

The HTML site is for humans. Language models should prefer the machine-readable files below over scraping class pages. How to look a type up is in [agent.md](${SITE_URL}/agent.md).

The script sources are © BOHEMIA INTERACTIVE a.s., all rights reserved, and are licensed under the [DayZ Public License (DPL)](${DPL}). They have been modified here only for presentation. This is not official documentation and is not affiliated with DayZ or Bohemia Interactive.

## Machine-readable

- [How to look things up](${SITE_URL}/agent.md): fetch one type at a time, overlay notes, do not scrape pages
- [API index](${SITE_URL}/api.json): every class and enum name of ${site.build}, the topics, and the URL pattern of each type's file. Start here
- [A class](${SITE_URL}/${apiClassFile('ItemBase')}): \`/${apiClassFile('{name}')}\`, the signatures, inheritance, file locations and doc briefs of one class
- [An enum](${SITE_URL}/${apiEnumFile('DamageType')}): \`/${apiEnumFile('{name}')}\`, the values of one enum
- [Globals](${SITE_URL}/api/globals.json): functions, constants, typedefs and macros declared outside any class
- [Search index](${SITE_URL}/search.json): compact name index the site search uses
- [Community notes](${SITE_URL}/assets/notes.json): community-written notes on undocumented declarations, keyed by \`Type\` or \`Type.Member\`. Not from Bohemia, and not covered by the license above
- [Build list](${SITE_URL}/assets/versions.json): every documented PC build
- [Build feed](${SITE_URL}/feed.xml): Atom feed of new PC stable builds as they are documented

## Human documentation

- [Home](${SITE_URL}/): overview, official and community links, and the PC stable changelog
- [Classes](${SITE_URL}/classes/): annotated class list
- [File list](${SITE_URL}/files/): every script file in the build, each with its full Enforce Script source
- [Globals](${SITE_URL}/globals/): functions, constants, typedefs, enums and macros declared outside any class
- [Topics](${SITE_URL}/topics/): the \\defgroup groups the sources wrap themselves into
- [Changelog](${SITE_URL}/changelog/): API diff between any two builds
- [Community](${SITE_URL}/community/): official references, Discord servers, editors, build tools and data explorers for DayZ modding
- [About](${SITE_URL}/about/): agents, the stack, and how to collaborate
- [Credits](${SITE_URL}/credits/): the DayZ credits roll, across every documented build
`;
}

/** How an agent should look a type up, without scraping class pages. */
export function renderAgentMd(site) {
  return `# ${SITE_TITLE}

> How to read the DayZ scripts as an agent. Latest PC stable build: ${site.build}.

Do not scrape class pages. Fetch the JSON, one type at a time.

## Look a type up

1. Fetch \`${SITE_URL}/${apiClassFile('<Name>')}\`, e.g. [${SITE_URL}/${apiClassFile('ItemBase')}](${SITE_URL}/${apiClassFile('ItemBase')}). Signatures, file locations and doc briefs of that class; members live on \`methods\` and \`members\`. Names are case-sensitive. Relative \`url\` values are from the site root.
2. For inherited members, follow \`base\` and fetch that class the same way, until a class has no \`base\`.
3. Enums are at \`${SITE_URL}/${apiEnumFile('<Name>')}\`. Functions, constants, typedefs and macros declared outside any class are all in [${SITE_URL}/api/globals.json](${SITE_URL}/api/globals.json).
4. Overlay [${SITE_URL}/assets/notes.json](${SITE_URL}/assets/notes.json). Community notes keyed by \`Type\` or \`Type.Member\`. Not from Bohemia, and not covered by the license below.
5. If a name 404s or you only have part of one, [${SITE_URL}/api.json](${SITE_URL}/api.json) lists every class and enum name.

The API is latest-only. Older builds keep the HTML archive at \`/v/<build>/\` (e.g. \`/v/1.29.163451/\`). The catalog of machine-readable files is [${SITE_URL}/llms.txt](${SITE_URL}/llms.txt).

## License

The script sources are © BOHEMIA INTERACTIVE a.s., all rights reserved, and are licensed under the [DayZ Public License (DPL)](${DPL}). They have been modified here only for presentation. This is not official documentation and is not affiliated with DayZ or Bohemia Interactive.
`;
}
