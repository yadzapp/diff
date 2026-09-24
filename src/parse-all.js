// Parses every DayZ build listed in data/versions.json into a JSON model
// (data/model-<build>.json). Sources are extracted from the upstream clone
// with `git archive`. Models are cached by commit sha; delete data/ to force
// a re-parse. Fails the build when parse diagnostics appear (unless
// ALLOW_DIAGS=1), so silent parser degradation is impossible.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, extractSources, modelFile, readJson, versionId, walk, writeJson } from './util.js';
import { parseFile } from './parser/index.js';

const MODEL_VERSION = 6;
const { versions, experimental } = readJson(path.join(DATA_DIR, 'versions.json'));
const only = process.env.ONLY_VERSION; // minor ("1.29") or full build ("1.29.163709")
const toParse = experimental ? [...versions, experimental] : versions;

function parseVersion(v) {
  const dest = modelFile(v);
  if (fs.existsSync(dest)) {
    const existing = readJson(dest);
    if (existing.sha === v.sha && existing.modelVersion === MODEL_VERSION && !process.env.FORCE_PARSE) {
      console.log(`${versionId(v)}: cached (${existing.stats.classes} classes)`);
      return existing.stats;
    }
  }

  const dir = extractSources(v);
  const files = walk(path.join(dir, 'scripts'), '.c', dir);
  const model = {
    modelVersion: MODEL_VERSION,
    version: v.version,
    build: v.build,
    sha: v.sha,
    date: v.date,
    ...(v.channel ? { channel: v.channel } : {}),
    files: [],
  };
  const allDiags = [];
  const stats = { files: files.length, classes: 0, methods: 0, members: 0, enums: 0, typedefs: 0, globals: 0, functions: 0, documented: 0 };

  for (const rel of files) {
    const source = fs.readFileSync(path.join(dir, rel), 'utf8');
    const { model: fm, diagnostics } = parseFile(source, rel);
    allDiags.push(...diagnostics);
    stats.classes += fm.classes.length;
    stats.enums += fm.enums.length;
    stats.typedefs += fm.typedefs.length;
    stats.globals += fm.globals.length;
    stats.functions += fm.functions.length;
    for (const c of fm.classes) {
      stats.methods += c.methods.length;
      stats.members += c.members.length;
      if (c.doc) stats.documented++;
      stats.documented += c.methods.filter((m) => m.doc).length;
    }
    model.files.push(fm);
  }
  const memberNames = new Set(
    model.files.flatMap((f) => f.classes.flatMap((c) => c.members.map((m) => m.name)))
  );
  for (const f of model.files) {
    for (const c of f.classes) {
      for (const m of c.methods) {
        if (m.refs) {
          m.refs = m.refs.filter((ref) => memberNames.has(ref.name));
          if (!m.refs.length) delete m.refs;
        }
      }
    }
  }

  model.stats = stats;
  model.diagnostics = allDiags;
  writeJson(dest, model);

  console.log(
    `${versionId(v)}: ${stats.files} files, ${stats.classes} classes, ${stats.methods} methods, ` +
    `${stats.enums} enums, ${stats.typedefs} typedefs, ${stats.globals} globals, ` +
    `${stats.functions} functions, ${allDiags.length} diagnostics`
  );
  for (const d of allDiags.slice(0, 30)) console.log(`   ! ${d.file}:${d.line} ${d.msg}`);
  if (allDiags.length > 30) console.log(`   ... and ${allDiags.length - 30} more`);
  return { ...stats, diagnostics: allDiags.length };
}

let failed = false;
for (const v of toParse) {
  if (only && versionId(v) !== only && v.version !== only && v.build !== only) continue;
  const stats = parseVersion(v);
  // Experimental can ship broken scripts (Bohemia typos); do not block the sync.
  if ((stats.diagnostics ?? 0) > 0 && !process.env.ALLOW_DIAGS && v.channel !== 'experimental') {
    failed = true;
  }
}

// Drop the experimental model once stable has caught up, so it cannot linger.
const experimentalModel = path.join(DATA_DIR, 'model-experimental.json');
if (!experimental && fs.existsSync(experimentalModel)) {
  fs.unlinkSync(experimentalModel);
  console.log('Removed stale model-experimental.json (experimental not ahead of stable).');
}

if (failed) {
  console.error('\nParse diagnostics found. Fix the parser or run with ALLOW_DIAGS=1 to accept.');
  process.exit(1);
}
