// Builds data/experimental.json: class → method signatures from
// BohemiaInteractive/DayZ-Script-Diff-Experimental. The Compare page fetches
// that file. The mod folder itself never leaves the browser.

import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR, DATA_DIR, git, walk, writeJson } from './util.js';
import { parseFile } from './parser/index.js';
import { moduleOf, sigFromMethod } from '../site/app/modcheck.js';

const URL = 'https://github.com/BohemiaInteractive/DayZ-Script-Diff-Experimental.git';
const DIR = path.join(CACHE_DIR, 'experimental');

function ensureClone() {
  if (!fs.existsSync(path.join(DIR, '.git'))) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Cloning ${URL} ...`);
    git(['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', URL, DIR]);
  } else {
    console.log('Updating experimental clone...');
    git(['-C', DIR, 'fetch', '--quiet', '--depth', '1', 'origin', 'main']);
    git(['-C', DIR, 'reset', '--quiet', '--hard', 'origin/main']);
  }
  git(['-C', DIR, 'sparse-checkout', 'set', '--skip-checks', 'scripts', 'scripts.txt']);
}

function headerValue(text, key) {
  return text.match(new RegExp(`^${key}=(.*)$`, 'mi'))?.[1]?.trim() || '';
}

function lastIdent(type) {
  const ids = String(type).match(/[A-Za-z_]\w*/g);
  return ids ? ids[ids.length - 1] : '';
}

ensureClone();
const sha = git(['-C', DIR, 'rev-parse', 'HEAD']).trim();
const headerPath = path.join(DIR, 'scripts.txt');
const header = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
const files = walk(path.join(DIR, 'scripts'), '.c', DIR);
const c = {};
let methods = 0;

for (const rel of files) {
  const { model } = parseFile(fs.readFileSync(path.join(DIR, rel), 'utf8'), rel);
  const layer = moduleOf(rel);
  for (const cls of model.classes) {
    const e = c[cls.name] || (c[cls.name] = {});
    if (cls.base) e.b = lastIdent(cls.base);
    if (layer && !e.d) e.d = layer;
    if (!cls.methods?.length) continue;
    e.m ||= {};
    for (const m of cls.methods) {
      if (!m.name) continue;
      const sig = sigFromMethod(m);
      const prev = e.m[m.name];
      if (!prev) {
        e.m[m.name] = sig;
        methods++;
      } else if (prev !== sig && !prev.split(' | ').includes(sig)) {
        e.m[m.name] = `${prev} | ${sig}`;
      }
    }
  }
}

const out = {
  repo: URL.replace(/\.git$/, ''),
  sha,
  version: headerValue(header, 'version'),
  product: headerValue(header, 'product'),
  prefix: headerValue(header, 'prefix'),
  classes: Object.keys(c).length,
  methods,
  c,
};
const dest = path.join(DATA_DIR, 'experimental.json');
writeJson(dest, out);
const kb = Math.round(fs.statSync(dest).size / 1024);
console.log(`${out.classes} classes, ${methods} methods, rev ${out.version || '?'} ${sha.slice(0, 10)} → ${dest} (${kb} KB)`);
