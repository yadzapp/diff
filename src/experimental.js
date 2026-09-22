// Builds data/experimental.json: class → method signatures from
// BohemiaInteractive/DayZ-Script-Diff-Experimental. The Mod check page fetches
// that file. The mod folder itself never leaves the browser.

import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR, EXPERIMENTAL_DIR, EXPERIMENTAL_URL, git, readJson, updateExperimental, walk, writeJson,
} from './util.js';
import { parseFile } from './parser/index.js';
import { moduleOf, sigFromMethod } from '../site/app/modcheck.js';

function headerValue(text, key) {
  return text.match(new RegExp(`^${key}=(.*)$`, 'mi'))?.[1]?.trim() || '';
}

function lastIdent(type) {
  const ids = String(type).match(/[A-Za-z_]\w*/g);
  return ids ? ids[ids.length - 1] : '';
}

updateExperimental();
const sha = git(['-C', EXPERIMENTAL_DIR, 'rev-parse', 'HEAD']).trim();
const headerPath = path.join(EXPERIMENTAL_DIR, 'scripts.txt');
const header = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
const files = walk(path.join(EXPERIMENTAL_DIR, 'scripts'), '.c', EXPERIMENTAL_DIR);
const c = {};
let methods = 0;

for (const rel of files) {
  const { model } = parseFile(fs.readFileSync(path.join(EXPERIMENTAL_DIR, rel), 'utf8'), rel);
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

// Prefer the live versions.json name ("1.30 Experimental") when experimental
// is ahead of stable; otherwise keep the previous name or a generic label.
let name = 'Experimental';
try {
  const versions = readJson(path.join(DATA_DIR, 'versions.json'));
  if (versions.experimental?.version) name = `${versions.experimental.version} Experimental`;
  else if (fs.existsSync(path.join(DATA_DIR, 'experimental.json'))) {
    name = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'experimental.json'), 'utf8')).name || name;
  }
} catch {}

const dest = path.join(DATA_DIR, 'experimental.json');
const out = {
  repo: EXPERIMENTAL_URL.replace(/\.git$/, ''),
  sha,
  name,
  version: headerValue(header, 'version'),
  product: headerValue(header, 'product'),
  prefix: headerValue(header, 'prefix'),
  classes: Object.keys(c).length,
  methods,
  c,
};
writeJson(dest, out);
const kb = Math.round(fs.statSync(dest).size / 1024);
console.log(`${out.classes} classes, ${methods} methods, rev ${out.version || '?'} ${sha.slice(0, 10)} → ${dest} (${kb} KB)`);
