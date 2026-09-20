/* The two pages whose rows are composed in the browser.

   Both are lists of "which classes declare this name", which search.json
   already answers for the whole build — so the generator ships the shell and
   these fill it in. See renderClassMembers in src/generate/render/class.js
   for what that saves.

   On a class page the "Full members" chip opens the same table in a side
   panel (plain click); the /members/ href stays for new-tab and no-JS. */

import { $, BASE, anchorOf, esc, track } from './dom.js';
import { button } from './button.js';
import { iconButton } from './icon-button.js';
import { bindPanelHash, closeOthers, onOverlay } from './overlay.js';
import { select } from './select.js';
import { index, loadIndex } from './search-index.js';

const fmt = (n) => n.toLocaleString('de-DE');

/** Build the all-members rows into `table` from search.json. */
function fillAllMembers(table, { onDone, onFail } = {}) {
  const chain = table.dataset.chain.split(',');
  const own = chain[0];
  const tbody = $('tbody', table);

  return loadIndex()
    .then(() => {
      const wanted = new Map(chain.map((n, i) => [n, i]));
      // name -> the position in the chain of each class declaring it
      const found = new Map();
      const note = (ci, name, method) => {
        const at = wanted.get(index.classes[ci]);
        if (at === undefined) return;
        const seen = found.get(name);
        if (seen) seen.at.push(at);
        else found.set(name, { at: [at], method });
      };
      for (const [ci, n] of index.methods || []) note(ci, n, true);
      for (const [ci, n] of index.vars || []) note(ci, n, false);

      const rows = [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      tbody.innerHTML = rows
        .map(([name, r]) => {
          // Nearest declaration wins, which is the one a call resolves to.
          const from = chain[Math.min(...r.at)];
          const shadows = r.at.length > 1;
          const kind = from !== own ? 'inherited' : shadows ? 'override' : 'own';
          const badge = kind === 'inherited'
            ? '<span class="badge badge-inherited inline-block ml-0 px-2 py-px rounded-full text-xs font-normal align-[2px] font-mono bg-bg3 text-fg2">inherited</span>'
            : kind === 'override'
              ? '<span class="badge badge-override inline-block ml-0 px-2 py-px rounded-full text-xs font-semibold align-[2px] font-mono bg-note-bg text-note-line" title="Also declared further up the chain">override</span>'
              : '';
          return /* html */ `<tr data-kind="${kind}" data-from="${esc(from)}"><td><a href="${BASE}classes/${from}/#${anchorOf(name)}"><code>${esc(name)}${r.method ? '()' : ''}</code></a></td><td><a href="${BASE}classes/${from}/">${esc(from)}</a></td><td>${badge}</td></tr>`;
        })
        .join('');

      const inherited = rows.filter(([, r]) => chain[Math.min(...r.at)] !== own).length;
      onDone?.({ total: rows.length, inherited, chain });
    })
    .catch(() => {
      onFail?.();
    });
}

function fieldSelect(kicker, label, options) {
  const wrap = select({
    variant: 'field',
    kicker,
    face: options[0]?.label || '',
    label,
  });
  const face = $('.select-face', wrap);
  const sel = $('select', wrap);
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    sel.append(opt);
  }
  const sync = () => {
    face.dataset.face = sel.selectedOptions[0]?.textContent || '';
  };
  sel.addEventListener('change', sync);
  sync();
  return { wrap, sel };
}

/** All members of a class: its own and everything it inherits. */
export function initAllMembers() {
  const allTable = $('#allMembers');
  if (!allTable) return;

  const fallback = $('.members-fallback');
  fillAllMembers(allTable, {
    onDone: ({ total, inherited }) => {
      if (fallback) {
        fallback.textContent =
          `${fmt(total)} members, ${fmt(inherited)} of them inherited.`;
      }
      $('h1')?.insertAdjacentHTML(
        'beforeend',
        ` <span class="count text-sm font-normal text-fg2">${fmt(total)}</span>`,
      );
    },
    onFail: () => {
      if (! $('tbody', allTable).children.length && fallback) {
        fallback.textContent =
          'The member list could not be loaded. Each class in the chain above lists its own members in full.';
      }
    },
  });
}

/** Class-page chip: open the full members table in the hierarchy-style panel. */
export function initFullMembersPanel() {
  const btn = $('.main a.all-members');
  const chain = btn?.dataset.chain;
  if (!btn || !chain) return;

  const wrap = document.createElement('div');
  wrap.className = 'hist-panel group';
  wrap.setAttribute('aria-hidden', 'true');
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none group-[.on]:opacity-100';
  scrim.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div');
  box.className = 'hist-panel-box members-panel-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.tabIndex = -1;
  const bar = document.createElement('div');
  bar.className = 'hist-bar';
  const heading = document.createElement('p');
  heading.className = 'hist-title';
  const countEl = document.createElement('span');
  countEl.className = 'count';
  const counted = btn.textContent.trim().match(/Full members(?:\s+(.+))?$/i);
  if (counted?.[1]) {
    // Chip may still use commas; normalize once we know the real totals.
    countEl.textContent = counted[1].replace(/,/g, '.');
    heading.replaceChildren('Members ', countEl);
  } else {
    heading.replaceChildren('Members ', countEl);
  }
  box.setAttribute('aria-label', 'Members');
  const kindFilters = document.createElement('div');
  kindFilters.className = 'cmp-filters';
  kindFilters.setAttribute('aria-label', 'Filter by kind');
  kindFilters.hidden = true;
  const activeKinds = new Set();
  for (const [value, label] of [
    ['own', 'Own'],
    ['override', 'Override'],
    ['inherited', 'Inherited'],
  ]) {
    const el = button({ text: label });
    el.dataset.kind = value;
    el.setAttribute('aria-pressed', 'false');
    kindFilters.append(el);
  }
  const closeBtn = iconButton({
    size: 'sm',
    style: 'gray',
    icon: 'x',
    label: 'Close',
  });
  bar.append(heading, kindFilters, closeBtn);
  const body = document.createElement('div');
  body.className = 'desc-panel-body';
  const status = document.createElement('p');
  status.className = 'members-fallback text-sm text-fg2 mt-0 mb-3';
  status.textContent = 'Assembling the list from the class index…';
  const table = document.createElement('table');
  table.className = 'list all-members-table';
  table.dataset.chain = chain;
  table.innerHTML = '<thead><tr><th>Member</th><th>Declared by</th><th></th></tr></thead><tbody></tbody>';
  body.append(status, table);
  box.append(bar, body);
  wrap.append(scrim, box);
  document.body.append(wrap);

  let loaded = false;
  let totals = { total: 0, inherited: 0 };
  let fromSel;
  let from = null;
  const isOpen = () => wrap.classList.contains('on');
  let reflect = () => {};

  const setCount = (text) => {
    countEl.textContent = text;
    box.setAttribute('aria-label', `Members ${text}`);
  };

  const summary = () => {
    const decl = fromSel?.value || '';
    const filtering = activeKinds.size > 0 || !!decl;
    if (!filtering) {
      setCount(`${fmt(totals.total)} (${fmt(totals.inherited)} inherited)`);
      return;
    }
    let shown = 0;
    for (const tr of table.tBodies[0].rows) {
      if (!tr.hidden) shown += 1;
    }
    setCount(`${fmt(shown)} of ${fmt(totals.total)}`);
  };

  const applyFilters = () => {
    const decl = fromSel?.value || '';
    for (const tr of table.tBodies[0].rows) {
      const kindOk = !activeKinds.size || activeKinds.has(tr.dataset.kind);
      tr.hidden = !kindOk || !!(decl && tr.dataset.from !== decl);
    }
    summary();
  };

  const trackFilters = () => {
    track('members_filter', {
      filter_kinds: [...activeKinds].join(',') || 'all',
      filter_class: fromSel?.value || 'all',
    });
  };

  kindFilters.addEventListener('click', (e) => {
    const el = e.target.closest('[data-kind]');
    if (!el) return;
    const on = el.getAttribute('aria-pressed') !== 'true';
    el.setAttribute('aria-pressed', String(on));
    if (on) activeKinds.add(el.dataset.kind);
    else activeKinds.delete(el.dataset.kind);
    applyFilters();
    trackFilters();
  });

  function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    fillAllMembers(table, {
      onDone: ({ total, inherited, chain: membersChain }) => {
        totals = { total, inherited };
        status.remove();
        const decl = fieldSelect('By', 'Filter by declaring class', [
          { value: '', label: 'All' },
          ...membersChain.map((n) => ({ value: n, label: n })),
        ]);
        fromSel = decl.sel;
        decl.sel.addEventListener('change', () => {
          applyFilters();
          trackFilters();
        });
        bar.insertBefore(decl.wrap, closeBtn);
        kindFilters.hidden = false;
        summary();
      },
      onFail: () => {
        if (!$('tbody', table).children.length) {
          status.textContent =
            'The member list could not be loaded. Open the full page, or follow each class in the inheritance chain.';
        }
      },
    });
  }

  function open() {
    if (isOpen()) return;
    closeOthers(close);
    from = document.activeElement;
    wrap.classList.add('on');
    wrap.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('hist-open');
    reflect(true);
    ensureLoaded();
    track('open_full_members');
    box.focus();
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

  ({ reflect } = bindPanelHash('full-members', { open, close, isOpen }));

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
  body.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    track('members_jump', { link_label: a.textContent.trim().slice(0, 80) });
    close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  if (location.hash === '#full-members') open();
}

/** The data-fields index: every member name of the build, by initial.
 *  A letter page paints the whole letter. */
export function initFieldsIndex() {
  const fieldsList = $('#fieldsList');
  if (!fieldsList) return;

  const kind = fieldsList.dataset.kind;
  const letter = fieldsList.dataset.letter || '';
  if (!letter) return;

  const letterOf = (n) => (/^[a-z]/i.test(n) ? n[0].toLowerCase() : '_');
  const fallback = $('.members-fallback');

  const collect = (pred) => {
    const owners = new Map();
    const add = (ci, name) => {
      if (!pred(name)) return;
      const cls = index.classes[ci];
      const list = owners.get(name);
      if (list) {
        if (!list.includes(cls)) list.push(cls);
      } else owners.set(name, [cls]);
    };
    if (kind !== 'variables') for (const [ci, n] of index.methods || []) add(ci, n);
    if (kind !== 'functions') for (const [ci, n] of index.vars || []) add(ci, n);
    return owners;
  };

  const paint = (owners) => {
    const names = [...owners.keys()].sort((a, b) => a.localeCompare(b));
    fieldsList.innerHTML = names
      .map((name) => {
        const dd = owners.get(name).map((c) => `<a href="${BASE}classes/${c}/#${anchorOf(name)}">${esc(c)}</a>`).join(' ');
        return /* html */ `<dt class="font-semibold mt-2.5"><code>${esc(name)}</code></dt><dd class="mt-0.5 ml-5 flex flex-wrap gap-x-3 gap-y-0.5 text-fg2">${dd}</dd>`;
      })
      .join('');
    if (fallback) {
      fallback.textContent = names.length ? `${fmt(names.length)} names.` : 'No names.';
    }
    return names.length;
  };

  loadIndex().then(() => {
    const n = paint(collect((name) => letterOf(name) === letter));
    $('h1').insertAdjacentHTML('beforeend', ` <span class="count text-sm font-normal text-fg2">${fmt(n)}</span>`);
  }).catch(() => {
    if (fallback) fallback.textContent = 'The list could not be loaded.';
  });
}
