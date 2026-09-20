/* What happened to this type: the badges, and the timeline.

   When a class or member first appeared, and when a signature last changed.
   The pages cannot carry a build stamp (see layout() in src/generate/html.js),
   so this is fetched from /assets/history.json — the same adjacent diffs
   /changelog/ folds, packed as indices into the newest-first build list.
   Events newer than the build being viewed stay off.

   history.json only says first and last, which is all a badge can wear. The
   whole story — every build that touched this type, member by member — is in
   /assets/timelines.json, packed the same way, and the History button beside
   the title fetches that on demand and lays it out in a panel. */

import { $, ROOT, esc, fmtDate, anchorOf, pageType, track } from './dom.js';
import { chip } from './chip.js';
import { iconButton } from './icon-button.js';
import { bindPanelHash, closeOthers, onOverlay } from './overlay.js';
import { onScroll, scrollH, scrollTop, viewH } from './scroll.js';
import { current, identity } from './builds.js';

const typeRec = (p) => {
  if (p == null) return null;
  if (typeof p === 'number') return { added: p, members: {} };
  return { added: p[0], members: p[1] || {}, removed: p[2] };
};

const memberEv = (p) =>
  (p == null ? null : typeof p === 'number' ? { added: p } : { added: p[0] < 0 ? undefined : p[0], changed: p[1] });

function historyBadge(kind, text, title, href) {
  const el = chip({
    tag: href ? 'a' : 'span',
    className: `chip-${kind}`,
    text,
    tip: title,
  });
  if (href) {
    el.href = href;
    el.addEventListener('click', () => track('history_badge', { badge_kind: kind }));
  }
  return el;
}

/** This build against the one before it, on /changelog/. No prior build → no link. */
const changelogHref = (builds, idx) => {
  const from = builds[idx + 1];
  return from
    ? `/changelog/?from=${encodeURIComponent(from.label)}&to=${encodeURIComponent(builds[idx].label)}`
    : null;
};

/** "1.29 Update 4". Experimental builds keep the build id as name — recover
 *  Update N from the archive label (126u1 → 1.26 Update 1). */
const updateTitle = (b) => {
  if (b.name && b.name !== b.build) return b.name;
  const m = /^(\d+)u(\d+)$/i.exec(b.label || '');
  if (m && b.version) return `${b.version} Update ${m[2]}`;
  return b.name || b.build;
};

/** "1.29 Update 4 (1.29.163709)". */
const buildTip = (b) => {
  const title = updateTitle(b);
  return title !== b.build ? `${title} (${b.build})` : b.build;
};

function titleActions(title) {
  let el = $('.title-actions', title);
  if (!el) {
    el = document.createElement('span');
    el.className = 'title-actions';
    el.hidden = true;
    title.append(el);
  }
  return el;
}

export function initHistory() {
  const main = $('.main');
  if (!pageType || !main) return;

  // Depth on class/enum pages: 25/50/75/100, once each per load.
  const marks = [25, 50, 75, 100];
  const seen = new Set();
  onScroll(() => {
    const max = scrollH() - viewH();
    if (max <= 0) return;
    const pct = (scrollTop() / max) * 100;
    for (const m of marks) {
      if (pct < m || seen.has(m)) continue;
      seen.add(m);
      track('scroll_depth', { percent: m, content_type: pageType.kind });
    }
  });

  const title = $('h1.class-title', main);
  const actions = title && titleActions(title);

  return Promise.all([
    fetch(ROOT + 'assets/history.json').then((r) => (r.ok ? r.json() : null)),
    identity(),
  ]).then(([hist, builds]) => {
    if (!hist?.builds || !current) return;
    const rec = typeRec(hist[pageType.kind]?.[pageType.name]);
    if (!rec) return;
    const here = hist.builds.indexOf(current.build);
    if (here < 0) return;
    const visible = (i) => i != null && i >= here;
    const pair = (idx) => {
      const b = builds[idx];
      return b ? { b } : null;
    };
    const addedBadge = (idx) => {
      const p = pair(idx);
      if (!p) return null;
      const oldest = idx === hist.builds.length - 1;
      return historyBadge(
        oldest ? 'since' : 'added',
        oldest ? `Since ${p.b.version}` : `Added in ${p.b.version}`,
        oldest ? null : buildTip(p.b),
      );
    };
    const changedBadge = (idx) => {
      const p = pair(idx);
      if (!p) return null;
      return historyBadge(
        'changed',
        `Changed in ${p.b.version}`,
        buildTip(p.b),
      );
    };
    const removedBadge = (idx) => {
      const p = pair(idx);
      if (!p) return null;
      return historyBadge(
        'removed',
        `Removed in ${p.b.version}`,
        buildTip(p.b),
      );
    };

    if (actions && visible(rec.added) && !title.hasAttribute('data-gone')) {
      const b = addedBadge(rec.added);
      if (b) actions.prepend(b);
    }
    if (actions && visible(rec.removed)) {
      const b = removedBadge(rec.removed);
      if (b) {
        const after = [...actions.children].find(
          (c) => !c.matches('.chip-added, .chip-since, .chip-removed'),
        );
        if (after) actions.insertBefore(b, after);
        else actions.append(b);
      }
    }
    for (const mem of main.querySelectorAll('.member[id]')) {
      const ev = memberEv(rec.members[mem.id]);
      if (!ev) continue;
      const sig = $('.member-sig', mem);
      if (!sig) continue;
      if (visible(ev.added)) { const b = addedBadge(ev.added); if (b) sig.append(b); }
      if (visible(ev.changed)) { const b = changedBadge(ev.changed); if (b) sig.append(b); }
    }
    for (const row of main.querySelectorAll('.enum-table tr[id]')) {
      const ev = memberEv(rec.members[row.id]);
      if (!ev) continue;
      const cell = row.cells[0] || row;
      if (visible(ev.added)) { const b = addedBadge(ev.added); if (b) cell.append(b); }
      if (visible(ev.changed)) { const b = changedBadge(ev.changed); if (b) cell.append(b); }
    }

    addTimeline(main, hist, builds, rec, here);
  }).catch(() => {});
}

/* ---------- the timeline ----------
   Beside the title on every class and enum page: when a Since chip is
   already there, the change count folds into it ("Since 1.19 · 3 changes");
   otherwise a 24px count button. Zero stays put (no click); otherwise
   opening fetches timelines.json and slides a panel in from the right.
   Linked as #history so the open panel can be shared and restored on load.
   Fetched rather than shipped for the same reason the badges are, and on
   demand rather than on load because most visits never ask.

   Only events at or before the build being viewed are shown, so an
   archived page tells the story as it stood then. */

/** What a row says happened, matching src/generate/diff.js. */
const OPS = { '+': ['added', '+'], '-': ['removed', '−'], '~': ['changed', '±'] };

const changesText = (n) => (n === 0 ? 'No changes' : n === 1 ? '1 change' : `${n} changes`);

function addTimeline(main, hist, builds, rec, here) {
  const title = $('h1.class-title', main);
  if (!title) return;

  const oldest = hist.builds.length - 1;
  // The run to show: from the build being viewed back to where the type
  // appeared. When the record cannot bound it — the type predates tracking,
  // or (after a remove-and-readd) the record names a build newer than this
  // page's — the whole span back to the oldest build does. The oldest
  // build has no diff, so nothing is packed for it.
  const stop = rec.added >= here && rec.added < oldest ? rec.added : oldest - 1;
  const n = (hist.changes?.[pageType.kind]?.[pageType.name] || [])
    .filter((i) => i >= here && i <= stop).length;

  const actions = titleActions(title);
  const since = $('.chip-since', actions);
  let btn;
  if (since) {
    const base = since.textContent.trim();
    btn = chip({
      tag: n ? 'a' : 'button',
      className: 'chip-since hist-btn',
      text: `${base} · ${changesText(n)}`,
    });
    if (n) btn.href = '#history';
    since.replaceWith(btn);
  } else {
    btn = iconButton({
      tag: n ? 'a' : 'button',
      size: 'sm',
      style: 'gray',
      className: 'hist-btn text-xs font-semibold tabular-nums leading-none',
      tip: n ? 'What changed in this type' : 'No changes across tracked builds',
      label: n ? `Changes, ${n} builds` : 'No changes',
      text: String(n),
    });
    if (n) btn.href = '#history';
    const file = $('.file-btn', actions);
    if (file) actions.insertBefore(btn, file);
    else {
      const copy = $('.copy-llm', actions);
      if (copy) actions.insertBefore(btn, copy);
      else actions.append(btn);
    }
  }

  // Zero is informational only — aria-disabled (not disabled) so the tip
  // still works and the chrome matches the other title actions.
  if (!n) {
    btn.setAttribute('aria-disabled', 'true');
    return;
  }

  btn.setAttribute('aria-expanded', 'false');

  const wrap = document.createElement('div');
  wrap.className = 'hist-panel group';
  wrap.setAttribute('aria-hidden', 'true');
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none group-[.on]:opacity-100';
  scrim.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div');
  box.className = 'hist-panel-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.tabIndex = -1;
  const bar = document.createElement('div');
  bar.className = 'hist-bar';
  const heading = document.createElement('p');
  heading.className = 'hist-title';
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = changesText(n);
  // Same bound the timeline uses: the add build, or the oldest tracked one.
  const sinceBuild = rec.added >= here && rec.added < oldest ? builds[rec.added] : builds[oldest];
  heading.replaceChildren(`Since ${sinceBuild?.version || ''} `, count);
  box.setAttribute('aria-label', heading.textContent);
  const closeBtn = iconButton({
    size: 'sm',
    style: 'gray',
    icon: 'x',
    label: 'Close',
  });
  bar.append(heading, closeBtn);
  const body = document.createElement('div');
  body.className = 'th-body';
  box.append(bar, body);
  wrap.append(scrim, box);
  document.body.append(wrap);

  // A declaration still on this page gets a link; one that was removed, or an
  // old spelling, is text. Enum rows are anchored by value name, members by
  // the generator's anchor.
  const hrefFor = (name) => {
    const id = pageType.kind === 'enum' ? name : anchorOf(name);
    return document.getElementById(id) ? `#${id}` : null;
  };

  const rowHtml = (row, hidden) => {
    const [op, name] = row;
    const [cls, sign] = OPS[op];
    const linked = (text) => {
      const code = `<code>${esc(text)}</code>`;
      const href = hrefFor(name);
      return href ? `<a class="th-link" href="${href}">${code}</a>` : code;
    };
    const inner = op === '~'
      ? `<span class="th-decl"><code class="old">${esc(row[2])}</code>${linked(row[3])}</span>`
      : op === '+'
        ? linked(row[2])
        : `<code class="old">${esc(row[2])}</code>`;
    return `<div class="th-row th-${cls}"${hidden ? ' hidden' : ''}><span class="th-op" aria-hidden="true">${sign}</span>${inner}</div>`;
  };

  // First glance is five. A click with a long tail opens ten, and a step
  // never leaves a single row behind — six remaining show as six, eleven
  // as eleven — so the button always pays for the click.
  const step = (remaining, first) => {
    const n = first ? 5 : 10;
    return remaining <= n + 1 ? remaining : n;
  };
  const moreLabel = (hidden) => {
    const n = step(hidden);
    return n < hidden ? `See ${n} more` : `See all (${hidden})`;
  };

  const entryHtml = ({ idx, added, rows }) => {
    const b = builds[idx];
    const title = updateTitle(b);
    const href = changelogHref(builds, idx);
    const changelog = href
      ? `<a class="icon-btn icon-btn-sm icon-btn-gray th-changelog" href="${href}" data-tip="Everything this build changed, on the changelog" aria-label="Changelog for ${esc(title)}"><i class="ic ic-ext" aria-hidden="true"></i></a>`
      : '';
    const head = `<p class="th-head"><span class="th-name">${esc(title)}</span>${changelog}` +
      (b.date ? `<span class="th-date">${fmtDate(b.date)}</span>` : '') +
      '</p>';
    const born = added
      ? `<p class="th-new">${pageType.kind === 'class' ? 'Class' : 'Enum'} added in this build.</p>`
      : '';
    // Every row is rendered; the ones past the cap wait, hidden, for the
    // button below them, so seeing more never rebuilds anything.
    const shown = step(rows.length, true);
    const list = rows.map((row, i) => rowHtml(row, i >= shown)).join('');
    const more = rows.length > shown
      ? `<button type="button" class="th-more self-start">${moreLabel(rows.length - shown)}</button>`
      : '';
    return `<div class="th-build flex flex-col gap-3 py-6">${head}${born}${list}${more}</div>`;
  };

  async function load() {
    const data = await fetch(ROOT + 'assets/timelines.json')
      .then((r) => (r.ok ? r.json() : null));
    if (!data) throw new Error('missing timelines');

    const entries = [];
    for (const [idx, added, rows] of data[pageType.kind]?.[pageType.name] || []) {
      if (idx < here || idx > stop) continue;
      entries.push({ idx, added, rows });
    }

    body.innerHTML = entries
      .map(entryHtml)
      .join('<div class="border-b border-line/40" aria-hidden="true"></div>');
  }

  // "See more" unhides the next handful in its own build and keeps or drops
  // itself by what is left. One delegated listener, since the buttons are
  // rebuilt with the body.
  body.addEventListener('click', (e) => {
    const more = e.target.closest('.th-more');
    if (more) {
      e.stopPropagation();
      const hidden = [...more.closest('.th-build').querySelectorAll('.th-row[hidden]')];
      const n = step(hidden.length);
      for (const row of hidden.slice(0, n)) row.hidden = false;
      if (hidden.length > n) more.textContent = moreLabel(hidden.length - n);
      else more.remove();
      return;
    }
    if (e.target.closest('.th-link')) {
      track('history_jump', { jump_kind: 'member' });
      close();
      return;
    }
    if (e.target.closest('.th-changelog')) track('history_jump', { jump_kind: 'changelog' });
  });

  let state = 'idle';
  let from = null;
  const isOpen = () => wrap.classList.contains('on');
  let reflect = () => {};

  function open() {
    if (isOpen()) return;
    closeOthers(close);
    from = document.activeElement;
    wrap.classList.add('on');
    wrap.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('hist-open');
    reflect(true);
    track('open_history');
    box.focus();
    if (state !== 'idle') return;
    state = 'loading';
    body.innerHTML = '<p class="muted text-fg2">Loading the history…</p>';
    load().then(
      () => { state = 'done'; },
      () => {
        state = 'idle';
        body.innerHTML = '<p class="muted text-fg2">Part of the history could not be loaded. Close and reopen to try again.</p>';
      }
    );
  }

  function close() {
    if (!isOpen()) return;
    wrap.classList.remove('on');
    wrap.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('hist-open');
    reflect(false);
    from?.focus?.();
  }

  ({ reflect } = bindPanelHash('history', { open, close, isOpen }));

  onOverlay(close);
  btn.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    isOpen() ? close() : open();
  });
  closeBtn.addEventListener('click', close);
  wrap.addEventListener('click', (e) => {
    if (!e.target.closest('.hist-panel-box')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  if (location.hash === '#history') open();
}
