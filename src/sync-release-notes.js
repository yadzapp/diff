// Fetch PC Stable patch notes from DayZ Wiki's MediaWiki API.
//
// The output is deliberately plain text and deterministic: it is safe to
// render, review in git, or edit by hand while the wiki catches up.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORUM_THREADS } from './generate/content.js';
import { DATA_DIR } from './util.js';

const OUTPUT = path.join(DATA_DIR, 'release-notes.json');
const API = 'https://dayz.wiki.gg/api.php';
const WIKI = 'https://dayz.wiki.gg/wiki/';
const USER_AGENT = 'YADZ-Diff/1.0 (https://github.com/yadzapp/diff)';
const MIN_WIKI_VERSION = 127;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const versionNo = (version) => Number(version.replace('.', ''));
const MONTHS = new Map(
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    .map((month, index) => [month, String(index + 1).padStart(2, '0')]),
);

function text(html) {
  return html
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turn the wiki's PC <details> blocks into safe, presentation-free data. */
export function parseReleaseNotes(html, version, revision) {
  html = html.replaceAll('&#95;', '_');
  const pc = html.match(/<article\b[^>]*\bid="PC-\d+"[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!pc) throw new Error(`Update ${version} has no PC patch-note panel`);

  const references = new Map();
  for (const match of html.matchAll(/<li\b[^>]*\bid="cite_note-([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi)) {
    const forumUrl = match[2].match(/href="(https:\/\/forums\.dayz\.com\/[^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
    if (forumUrl) references.set(match[1], forumUrl);
  }

  const releases = {};
  for (const match of pc.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
    const block = match[1];
    const summaryMatch = block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    if (!summaryMatch) continue;
    const title = text(summaryMatch[1]);
    const build = title.match(/\bVersion\s+(\d+\.\d+\.\d+)\b/i)?.[1];
    if (!build || !/\bStable\b/i.test(title)) continue;
    const dateMatch = title.match(/\((\d{1,2}) ([A-Z][a-z]+) (\d{4})\)/);
    const date = dateMatch && MONTHS.has(dateMatch[2])
      ? `${dateMatch[3]}-${MONTHS.get(dateMatch[2])}-${dateMatch[1].padStart(2, '0')}`
      : undefined;
    const referenceIds = [...summaryMatch[1].matchAll(/href="#cite_note-([^"]+)"/g)].map((ref) => ref[1]);
    const forumUrl = referenceIds.map((id) => references.get(id)).find(Boolean);

    const sections = [];
    const body = block.slice((summaryMatch.index || 0) + summaryMatch[0].length);
    for (const token of body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>|<b\b[^>]*>([\s\S]*?)<\/b>/gi)) {
      if (token[1] !== undefined) {
        const item = text(token[1]);
        if (!item) continue;
        if (!sections.length) sections.push({ items: [] });
        sections.at(-1).items.push(item);
      } else {
        const heading = text(token[2]);
        if (heading) sections.push({ heading, items: [] });
      }
    }

    releases[build] = {
      title: title.replace(/\s*\[\d+(?:\.\d+)?\]\s*$/, ''),
      ...(date && { date }),
      ...(forumUrl && { forumUrl }),
      wikiUrl: `${WIKI}Update_${version}`,
      wikiRevision: revision,
      sections,
    };
  }
  return releases;
}

async function fetchPage(version) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: 'parse',
    page: `Update ${version}`,
    prop: 'text|revid',
    format: 'json',
    formatversion: '2',
    maxlag: '5',
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    const json = await response.json();
    if (response.ok && json.parse) return parseReleaseNotes(json.parse.text, version, json.parse.revid);
    if (json.error?.code === 'missingtitle') return {};
    if (response.status !== 429 && json.error?.code !== 'maxlag') {
      throw new Error(`Update ${version}: ${json.error?.info || `HTTP ${response.status}`}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep((retryAfter || [5, 15, 30, 60][attempt]) * 1000);
  }
  throw new Error(`Update ${version}: API remained rate limited`);
}

async function main() {
  const current = fs.existsSync(OUTPUT)
    ? JSON.parse(fs.readFileSync(OUTPUT, 'utf8'))
    : { releases: {} };
  const releases = { ...current.releases };
  const versions = [...new Set(Object.keys(FORUM_THREADS).map((build) => build.split('.').slice(0, 2).join('.')))]
    .filter((version) => versionNo(version) >= MIN_WIKI_VERSION)
    .sort((a, b) => versionNo(a) - versionNo(b));

  let fetched = 0;
  for (const version of versions) {
    try {
      Object.assign(releases, await fetchPage(version));
      fetched++;
    } catch (error) {
      console.error(error.message);
    }
    await sleep(1500);
  }
  if (!fetched) throw new Error('DayZ Wiki API did not return any release-note pages');

  const sorted = Object.fromEntries(
    Object.entries(releases).sort(([a], [b]) => Number(b.split('.')[2]) - Number(a.split('.')[2])),
  );
  const next = `${JSON.stringify({ releases: sorted }, null, 2)}\n`;
  const previous = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
  if (next === previous) {
    console.log('Release notes are current.');
    return;
  }
  fs.writeFileSync(OUTPUT, next);
  console.log(`Wrote ${Object.keys(sorted).length} releases to ${path.relative(process.cwd(), OUTPUT)}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
