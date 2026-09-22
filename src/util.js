import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = (() => {
  try {
    return path.resolve(new URL('..', import.meta.url).pathname);
  } catch {
    return process.cwd();
  }
})();
export const CACHE_DIR = path.join(ROOT, '.cache');
export const DATA_DIR = path.join(ROOT, 'data');
export const DIST_DIR = path.join(ROOT, 'dist');
export const UPSTREAM_DIR = path.join(CACHE_DIR, 'upstream');
export const UPSTREAM_URL = 'https://github.com/BohemiaInteractive/DayZ-Script-Diff.git';
export const EXPERIMENTAL_DIR = path.join(CACHE_DIR, 'experimental');
export const EXPERIMENTAL_URL = 'https://github.com/BohemiaInteractive/DayZ-Script-Diff-Experimental.git';

export function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
    ...opts,
  });
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

/** True when `a` is a strictly greater build number than `b` (e.g. 1.30.1 > 1.29.9). */
export function isAhead(a, b) {
  const A = String(a).split('.').map(Number);
  const B = String(b).split('.').map(Number);
  return A[0] > B[0]
    || (A[0] === B[0] && A[1] > B[1])
    || (A[0] === B[0] && A[1] === B[1] && A[2] > B[2]);
}

/** Clone or update DayZ-Script-Diff-Experimental (shallow, sparse scripts). */
export function updateExperimental() {
  if (!fs.existsSync(path.join(EXPERIMENTAL_DIR, '.git'))) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Cloning ${EXPERIMENTAL_URL} ...`);
    git(['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', EXPERIMENTAL_URL, EXPERIMENTAL_DIR]);
  } else {
    console.log('Updating experimental clone...');
    git(['-C', EXPERIMENTAL_DIR, 'fetch', '--quiet', '--depth', '1', 'origin', 'main']);
    git(['-C', EXPERIMENTAL_DIR, 'reset', '--quiet', '--hard', 'origin/main']);
  }
  git(['-C', EXPERIMENTAL_DIR, 'sparse-checkout', 'set', '--skip-checks', 'scripts', 'scripts.txt']);
  return EXPERIMENTAL_DIR;
}

/** Model path: experimental stays at model-experimental.json so a later stable
 *  with the same build number cannot collide. */
export function modelFile(v) {
  const name = v.channel === 'experimental' ? 'experimental' : v.build;
  return path.join(DATA_DIR, `model-${name}.json`);
}

function cloneOf(v) {
  return v.channel === 'experimental' ? EXPERIMENTAL_DIR : UPSTREAM_DIR;
}

function srcKey(v) {
  // Label, not build: an experimental build that later ships as stable with
  // the same number must not share a source tree.
  return v.channel === 'experimental' ? v.label : v.build;
}

/** Extract the scripts/ tree of a version commit into .cache/src/<key>. */
export function extractSources(v) {
  const dir = path.join(CACHE_DIR, 'src', srcKey(v));
  const marker = path.join(dir, '.sha');
  const scripts = path.join(dir, 'scripts');
  // A leftover .sha with no scripts/ used to short-circuit and leave every
  // file page reading a path that is not there.
  if (
    fs.existsSync(marker) &&
    fs.readFileSync(marker, 'utf8') === v.sha &&
    fs.existsSync(scripts)
  ) {
    return dir;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const clone = cloneOf(v);
  execSync(`git -C "${clone}" archive ${v.sha} scripts | tar -x -C "${dir}"`, { stdio: 'inherit' });
  fs.writeFileSync(marker, v.sha);
  return dir;
}

/**
 * Blob sha of every script file in a version commit, keyed by the same path
 * the models use. A file page renders nothing but its source, so an unchanged
 * blob sha is proof the page is unchanged — and getting it from the index
 * costs one git call per build instead of reading 19 MB of sources.
 */
export function sourceBlobs(v) {
  const out = new Map();
  let listing;
  try {
    listing = git(['-C', cloneOf(v), 'ls-tree', '-r', '-z', v.sha, '--', 'scripts']);
  } catch {
    return out; // no clone to ask: callers fall back to rendering every page
  }
  // -z gives "<mode> <type> <sha>\t<path>" records separated by NULs, so paths
  // never come back quoted or escaped.
  for (const entry of listing.split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    out.set(entry.slice(tab + 1), entry.slice(0, tab).split(' ')[2]);
  }
  return out;
}

/** Recursively list files under dir matching the extension, as relative paths. */
export function walk(dir, ext, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext, base));
    else if (entry.name.toLowerCase().endsWith(ext)) out.push(path.relative(base, full));
  }
  return out.sort();
}
