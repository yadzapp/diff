// When each class, enum and member first appeared, when a member last changed,
// and when a type was removed. Built from the same adjacent diffs the changelog
// folds — one walk oldest → newest while generate already holds each pair.
//
// Packed as build indices into a newest-first `builds` array so the file stays
// small and the client can ignore events newer than the build it is viewing.
// A type that is already in the oldest tracked build is not "added" there; the
// client prints Since, because the archive does not go further back. A type
// that left the API keeps its record with a removed index, so a tombstone page
// can wear "Removed in".
//
// The same walk also keeps every added/changed row, written to timelines.json
// so the History disclosure does not have to fetch the per-build diffs. Events
// survive a remove-and-readd; the badge record resets to the re-add, and
// archived pages of the earlier life still need those rows.

import { ADDED, REMOVED, CHANGED, diffModels } from './diff.js';

function emptyRec(build) {
  return { added: build, members: new Map() };
}

function seedKind(names, build) {
  const out = new Map();
  for (const name of names) out.set(name, emptyRec(build));
  return out;
}

export function seedHistory(site) {
  return {
    class: seedKind(site.classes.keys(), site.build),
    enum: seedKind(site.enums.keys(), site.build),
  };
}

function applyKind(map, kind, build) {
  if (!kind) return;
  for (const name of kind.added) map.set(name, emptyRec(build));
  // Keep the record so /classes/<Gone>/ can still wear a "Removed in" chip;
  // a later re-add replaces it via emptyRec above.
  for (const name of kind.removed) {
    const rec = map.get(name);
    if (rec) rec.removed = build;
  }
  for (const entry of kind.changed) {
    let rec = map.get(entry.name);
    if (!rec) map.set(entry.name, (rec = emptyRec(build)));
    for (const row of entry.rows) {
      const [op, mem] = row;
      if (op === ADDED) {
        const prev = rec.members.get(mem);
        rec.members.set(mem, { added: build, changed: prev?.changed });
      } else if (op === CHANGED) {
        const prev = rec.members.get(mem) || {};
        rec.members.set(mem, { added: prev.added, changed: build });
      } else if (op === REMOVED) rec.members.delete(mem);
    }
  }
}

export function applyDiff(history, diff, build) {
  applyKind(history.class, diff.class, build);
  applyKind(history.enum, diff.enum, build);
}

export function seedTimelines() {
  return { class: new Map(), enum: new Map() };
}

function applyTimelineKind(map, kind, build) {
  if (!kind) return;
  const changed = new Map((kind.changed || []).map((e) => [e.name, e.rows]));
  for (const name of kind.added || []) {
    const events = map.get(name) || [];
    events.push({ build, added: true, rows: changed.get(name) || [] });
    map.set(name, events);
    changed.delete(name);
  }
  for (const [name, rows] of changed) {
    if (!rows.length) continue;
    const events = map.get(name) || [];
    events.push({ build, added: false, rows });
    map.set(name, events);
  }
}

export function applyTimeline(timelines, diff, build) {
  applyTimelineKind(timelines.class, diff.class, build);
  applyTimelineKind(timelines.enum, diff.enum, build);
}

function packMembers(members, idx) {
  const out = {};
  for (const [name, ev] of members) {
    const a = ev.added != null ? idx.get(ev.added) : undefined;
    const c = ev.changed != null ? idx.get(ev.changed) : undefined;
    if (a == null && c == null) continue;
    out[name] = c == null ? a : [a ?? -1, c];
  }
  return out;
}

function packKind(map, idx) {
  const out = {};
  for (const [name, rec] of map) {
    const added = idx.get(rec.added);
    if (added == null) continue;
    const members = packMembers(rec.members, idx);
    const removed = rec.removed != null ? idx.get(rec.removed) : undefined;
    if (removed != null) {
      // [added, members|null, removed] — members stay null when silent so the
      // third slot is unambiguous against the alive [added, members] shape.
      out[name] = [added, Object.keys(members).length ? members : null, removed];
    } else {
      out[name] = Object.keys(members).length ? [added, members] : added;
    }
  }
  return out;
}

function packCounts(events, known, idx) {
  const out = {};
  for (const [name, list] of events) {
    if (!known.has(name)) continue;
    const packed = [];
    for (const ev of list) {
      const i = idx.get(ev.build);
      if (i != null) packed.push(i);
    }
    packed.sort((a, b) => a - b);
    if (packed.length) out[name] = packed;
  }
  return out;
}

/** Newest-first `versions` (the same order as assets/versions.json).
 *  `changes` is the event indices only, so the button can count without
 *  fetching timelines.json. */
export function serializeHistory(history, versions, timelines) {
  const idx = new Map(versions.map((v, i) => [v.build, i]));
  const packed = {
    builds: versions.map((v) => v.build),
    class: packKind(history.class, idx),
    enum: packKind(history.enum, idx),
  };
  if (timelines) {
    packed.changes = {
      class: packCounts(timelines.class, history.class, idx),
      enum: packCounts(timelines.enum, history.enum, idx),
    };
  }
  return packed;
}

function packEvents(events, known, idx) {
  const out = {};
  for (const [name, list] of events) {
    if (!known.has(name)) continue;
    const packed = [];
    for (const ev of list) {
      const i = idx.get(ev.build);
      if (i == null) continue;
      packed.push([i, ev.added ? 1 : 0, ev.rows]);
    }
    packed.sort((a, b) => a[0] - b[0]);
    if (packed.length) out[name] = packed;
  }
  return out;
}

/** Same indices as serializeHistory. Includes types that were later removed. */
export function serializeTimelines(timelines, history, versions) {
  const idx = new Map(versions.map((v, i) => [v.build, i]));
  return {
    builds: versions.map((v) => v.build),
    class: packEvents(timelines.class, history.class, idx),
    enum: packEvents(timelines.enum, history.enum, idx),
  };
}

/**
 * Last known class/enum models for types absent from the newest build.
 * Used to render tombstone pages at /classes/<Gone>/ and /enum/<Gone>/.
 */
export function collectGone(versions, siteFor) {
  const gone = { class: new Map(), enum: new Map() };
  let prev = null;
  for (const v of [...versions].reverse()) {
    const site = siteFor(v.label);
    if (!site) continue;
    if (prev) {
      const diff = diffModels(site, prev);
      for (const name of diff.class.removed) {
        const cls = prev.classes.get(name);
        if (cls) gone.class.set(name, cls);
      }
      for (const name of diff.class.added) gone.class.delete(name);
      for (const name of diff.enum.removed) {
        const en = prev.enums.get(name);
        if (en) gone.enum.set(name, en);
      }
      for (const name of diff.enum.added) gone.enum.delete(name);
    }
    prev = site;
  }
  return gone;
}

const emptyPacked = { builds: [], class: {}, enum: {} };

/**
 * Walk every build oldest → newest. Used by src/dev.js, which never
 * generates; generate itself applies each diff as it goes instead.
 */
export function buildHistoryAssets(versions, siteFor) {
  let history = null;
  const timelines = seedTimelines();
  let prev = null;
  for (const v of [...versions].reverse()) {
    const site = siteFor(v.label);
    if (!site) continue;
    if (!history) history = seedHistory(site);
    else {
      const diff = diffModels(site, prev);
      applyDiff(history, diff, site.build);
      applyTimeline(timelines, diff, site.build);
    }
    prev = site;
  }
  if (!history) return { history: emptyPacked, timelines: emptyPacked };
  return {
    history: serializeHistory(history, versions, timelines),
    timelines: serializeTimelines(timelines, history, versions),
  };
}

export function buildHistory(versions, siteFor) {
  return buildHistoryAssets(versions, siteFor).history;
}
