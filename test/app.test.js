// Runs site/app.js against a DOM where nothing is found.
//
// The client is a list of feature inits (site/app.js) over a module each
// (site/app/*.js), and every one of them is guarded by whether the element it
// works on is on the page — so on any real page most of them do nothing. That
// makes a mistake in one invisible until someone loads the one page that
// reaches it. boot() in the entry keeps a throw from taking the rest down, and
// logs `[app] <feature> failed`; this file turns those into a failing test so
// a broken init is not only a console line someone has to notice.
//
// A stub that answers "no such element" to everything still runs all of those
// guards. So this walks the whole chain without needing a real DOM.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = path.join(ROOT, 'site', 'app');
const ENTRY = pathToFileURL(path.join(ROOT, 'site', 'app.js')).href;

/** An element that exists but holds nothing and answers every call. */
function stubEl() {
  const el = {
    dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], childNodes: [], cells: [], hidden: false, textContent: '', innerHTML: '', value: '',
    tagName: 'DIV', id: '', href: '', className: '', type: '', title: '',
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, append() {}, prepend() {}, before() {}, after() {},
    remove() {}, replaceWith() {}, insertBefore() {}, insertAdjacentHTML() {}, cloneNode: () => stubEl(),
    setAttribute() {}, getAttribute: () => null, removeAttribute() {}, closest: () => null,
    focus() {}, blur() {}, click() {}, select() {}, scrollIntoView() {}, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
  return el;
}

/* Globals the modules read straight off the environment. Kept as one list so
   they can all be taken back off again afterwards: the rest of the suite runs
   in this same process and must not inherit a browser. */
const INSTALLED = [];
function define(name, value) {
  if (!INSTALLED.includes(name)) INSTALLED.push(name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

after(() => {
  for (const name of INSTALLED) delete globalThis[name];
});

function install(overrides = {}) {
  const document = {
    documentElement: stubEl(),
    body: stubEl(),
    head: stubEl(),
    activeElement: stubEl(),
    createElement: () => stubEl(),
    createTextNode: () => stubEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {},
    readyState: 'loading',
    ...overrides,
  };
  define('document', document);
  define('location', { hash: '', pathname: '/', href: 'https://example.test/', search: '', origin: 'https://example.test' });
  define('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  define('sessionStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  define('history', { replaceState() {}, pushState() {} });
  define('navigator', { platform: 'MacIntel', userAgent: 'test', clipboard: { writeText: () => Promise.resolve() } });
  define('fetch', () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  define('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  define('getComputedStyle', () => ({ getPropertyValue: () => '', marginTop: '0px' }));
  define('requestAnimationFrame', (fn) => fn(0));
  define('ResizeObserver', class { observe() {} disconnect() {} });
  define('scrollTo', () => {});
  define('scrollY', 0);
  define('innerHeight', 800);
  define('addEventListener', () => {});
  define('removeEventListener', () => {});
  define('window', globalThis);
  return document;
}

/* The entry is re-imported per run with a fresh query so its inits run again.
   The feature modules behind it stay cached, which is what they would be in a
   browser too: one evaluation, one set of listeners. */
let runs = 0;
const run = (overrides) => {
  install(overrides);
  return import(`${ENTRY}?run=${runs++}`);
};

/** Let the promise chains the inits started settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** boot() logs `[app] <name> failed` instead of throwing — collect those. */
function watchBootErrors() {
  const seen = [];
  const orig = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[app] ')) seen.push(args[0]);
    orig.apply(console, args);
  };
  return {
    seen,
    stop() { console.error = orig; },
  };
}

test('the client runs end to end on a page where every feature is absent', async () => {
  const watch = watchBootErrors();
  try {
    await assert.doesNotReject(run());
    await settle();
    assert.deepEqual(watch.seen, [], `client boot failures:\n${watch.seen.join('\n')}`);
  } finally {
    watch.stop();
  }
});

// The compare page is the one feature that hands its work to a second file,
// and the branch that does so is skipped on all ~416k other pages — which is
// the shape of the bug this whole file is here to catch. The import cannot
// resolve outside a browser; that the failure is caught rather than thrown,
// and says so on the page, is the point.
test('the workshop list says so when it cannot load', async () => {
  const box = stubEl();
  await run({ querySelector: (s) => (s === '#workshop-list' ? box : null) });
  await settle();
  assert.match(box.textContent, /could not be loaded/);
});

test('the changelog hands off to compare.js, and says so when it cannot', async () => {
  const compare = stubEl();
  await run({ querySelector: (s) => (s === '#compare' ? compare : null) });
  await settle();
  assert.match(compare.textContent, /could not be loaded/);
});

// A module nothing imports is dead weight that still reads as live code. The
// entry is the only place features are wired up, so every one of them has to
// be named there — bar the ones that exist to be shared.
test('every module in site/app/ is reachable from the entry', () => {
  const entry = fs.readFileSync(path.join(ROOT, 'site', 'app.js'), 'utf8');
  // tree.js is how a files tree behaves, not a feature of its own: the column
  // is the only thing that puts one on a page, and it wires it (filetree.js).
  // scroll.js is which element the page scrolls in, which is a question every
  // feature that moves the page has to ask and none of them owns. pill.js is
  // the travelling highlight for the version menu.
  // chip.js is the shared outlined control; features build their variants of it.
  // tag.js is the uppercase callout label (Archive, Note, Warning).
  // banner.js is the archive/removed callout builds.js puts above a stale page.
  // button.js / icon-button.js / select.js are the control factories; features
  // build the page-specific instances (changelog filters, rail toggles, …).
  const shared = new Set([
    'dom.js', 'overlay.js', 'search-index.js', 'highlight.js', 'tree.js', 'scroll.js', 'pill.js',
    'chip.js', 'tag.js', 'banner.js', 'button.js', 'icon-button.js', 'select.js',
  ]);
  const sources = new Map(
    fs.readdirSync(APP_DIR)
      .filter((f) => f.endsWith('.js'))
      .map((f) => [f, fs.readFileSync(path.join(APP_DIR, f), 'utf8')])
  );

  // Gather every break in one pass so the failure names the whole set, not
  // whichever file the loop hit first — and so the message says what to do.
  const orphans = [];
  const unwired = [];
  for (const name of sources.keys()) {
    if (shared.has(name)) {
      const importedBy = [...sources].filter(([f, src]) => f !== name && src.includes(`./${name}`));
      if (!importedBy.length) orphans.push(name);
      continue;
    }
    if (!entry.includes(`./app/${name}`)) unwired.push(name);
  }

  if (!orphans.length && !unwired.length) return;

  const lines = ['site/app modules that nothing reaches:'];
  if (orphans.length) {
    lines.push('', 'Shared, but no feature imports them — wire one up, or drop them from the shared list / delete the file:');
    for (const name of orphans) lines.push(`  - site/app/${name}`);
  }
  if (unwired.length) {
    lines.push('', 'Features missing from site/app.js — name them in the entry, or delete the file:');
    for (const name of unwired) lines.push(`  - site/app/${name}`);
  }
  assert.fail(lines.join('\n'));
});
