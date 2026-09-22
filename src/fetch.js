// Clones/updates the official DayZ-Script-Diff repository and maps its
// commit history to DayZ builds. Each commit message looks like:
//   "Build 1.29.163709, Scripts Rev. 125372"
// Every build is documented (1.29.163709, 1.29.163451, ...); when several
// commits share a build number we keep the newest one.
//
// The Experimental repo head is recorded too, but only while its build number
// is greater than the newest stable — then the site documents it at
// /v/experimental/. Once stable catches up, experimental is null.

import fs from 'node:fs';
import path from 'node:path';
import {
  CACHE_DIR, DATA_DIR, EXPERIMENTAL_DIR, UPSTREAM_DIR, UPSTREAM_URL,
  git, isAhead, updateExperimental, writeJson,
} from './util.js';
import { archiveLabels } from './generate/render/shared.js';

export const BUILD_RE = /^Build (\d+)\.(\d+)\.(\d+), Scripts Rev\. (\d+)$/;
export { isAhead };

function updateUpstream() {
  if (fs.existsSync(path.join(UPSTREAM_DIR, '.git'))) {
    console.log('Updating upstream clone...');
    git(['-C', UPSTREAM_DIR, 'fetch', '--quiet', 'origin', 'main']);
  } else {
    console.log(`Cloning ${UPSTREAM_URL} ...`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    git(['clone', '--quiet', '--no-checkout', UPSTREAM_URL, UPSTREAM_DIR]);
  }
}

function detectVersions() {
  const log = git(['-C', UPSTREAM_DIR, 'log', 'origin/main', '--format=%H%x09%cI%x09%s']);
  const byBuild = new Map(); // "1.29.163709" -> newest matching commit (log is newest-first)
  const skipped = [];
  for (const line of log.trim().split('\n')) {
    const [sha, date, subject] = line.split('\t');
    const m = subject.match(BUILD_RE);
    if (!m) {
      skipped.push(subject);
      continue;
    }
    const build = `${m[1]}.${m[2]}.${m[3]}`;
    if (!byBuild.has(build)) {
      byBuild.set(build, {
        version: `${m[1]}.${m[2]}`,
        build,
        rev: Number(m[4]),
        sha,
        date: date.slice(0, 10),
      });
    }
  }
  if (skipped.length) console.log(`Skipped ${skipped.length} non-build commits.`);
  // Newest first by build number (not by date; history contains reverts and
  // out-of-order hotfixes, e.g. a 1.25 hotfix released after the first 1.26).
  const versions = [...byBuild.values()].sort((a, b) => {
    const A = a.build.split('.').map(Number);
    const B = b.build.split('.').map(Number);
    return B[0] - A[0] || B[1] - A[1] || B[2] - A[2];
  });
  const labels = archiveLabels(versions);
  for (const v of versions) v.label = labels.get(v.build);
  return versions;
}

/** Current Experimental head, or null when it is not ahead of the newest stable. */
function detectExperimental(newestStable) {
  updateExperimental();
  const line = git(['-C', EXPERIMENTAL_DIR, 'log', '-1', 'origin/main', '--format=%H%x09%cI%x09%s']).trim();
  if (!line) return null;
  const [sha, date, subject] = line.split('\t');
  const m = subject.match(BUILD_RE);
  if (!m) {
    console.log(`Experimental head is not a build commit (${subject}); ignoring.`);
    return null;
  }
  const build = `${m[1]}.${m[2]}.${m[3]}`;
  if (!newestStable || !isAhead(build, newestStable.build)) {
    console.log(`Experimental ${build} is not ahead of stable ${newestStable?.build || '?'}; omitted.`);
    return null;
  }
  return {
    version: `${m[1]}.${m[2]}`,
    build,
    rev: Number(m[4]),
    sha,
    date: date.slice(0, 10),
    label: 'experimental',
    channel: 'experimental',
  };
}

updateUpstream();
const versions = detectVersions();
const experimental = detectExperimental(versions[0]);
const head = git(['-C', UPSTREAM_DIR, 'rev-parse', 'origin/main']).trim();
const dest = path.join(DATA_DIR, 'versions.json');
const next = {
  fetchedAt: new Date().toISOString(),
  upstreamHead: head,
  versions,
  experimental,
};
const prev = fs.existsSync(dest) ? JSON.parse(fs.readFileSync(dest, 'utf8')) : null;
if (
  prev?.upstreamHead === head &&
  JSON.stringify(prev.versions) === JSON.stringify(versions) &&
  JSON.stringify(prev.experimental ?? null) === JSON.stringify(experimental)
) {
  console.log(`versions.json unchanged (${versions.length} versions).`);
} else {
  writeJson(dest, next);
}

console.log(`Found ${versions.length} versions:`);
for (const v of versions) console.log(`  ${v.label}  build ${v.build}  rev ${v.rev}  ${v.date}  ${v.sha.slice(0, 10)}`);
if (experimental) {
  console.log(`Experimental: ${experimental.build}  rev ${experimental.rev}  ${experimental.date}  ${experimental.sha.slice(0, 10)}`);
}
