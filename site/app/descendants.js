/* Hierarchy panel for a class page: the "Full hierarchy N" chip under the
   breadcrumbs opens the same right-hand panel shell as History, with the
   focused ancestor path and the descendant tree. Linked as #hierarchy so the
   open panel can be shared and restored on load. */

import { $, track } from './dom.js';
import { chip } from './chip.js';
import { iconButton } from './icon-button.js';
import { bindPanelHash, closeOthers, onOverlay } from './overlay.js';

export function initDescendants() {
  const btn = $('.main .desc-btn');
  const src = $('.main .desc-src');
  if (!btn || !src) return;

  const wrap = document.createElement('div');
  wrap.className = 'hist-panel group';
  wrap.setAttribute('aria-hidden', 'true');
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none group-[.on]:opacity-100';
  scrim.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div');
  box.className = 'hist-panel-box desc-panel-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.tabIndex = -1;
  const bar = document.createElement('div');
  bar.className = 'hist-bar';
  const heading = document.createElement('p');
  heading.className = 'hist-title';
  const counted = btn.textContent.trim().match(/Full hierarchy(?:\s+(.+))?$/i);
  if (counted?.[1]) {
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = counted[1];
    heading.replaceChildren('Hierarchy ', count);
  } else {
    heading.textContent = 'Hierarchy';
  }
  box.setAttribute('aria-label', heading.textContent);
  const closeBtn = iconButton({
    size: 'sm',
    style: 'gray',
    icon: 'x',
    label: 'Close',
  });
  bar.append(heading);
  const hasBranches = !!src.content.querySelector('details.desc-branch');
  let expandBtn;
  let collapseBtn;
  if (hasBranches) {
    expandBtn = chip({ tip: 'Expand all branches', label: 'Expand all', text: 'Expand all' });
    collapseBtn = chip({ tip: 'Collapse all branches', label: 'Collapse all', text: 'Collapse all' });
    bar.append(expandBtn, collapseBtn);
  }
  bar.append(closeBtn);
  const body = document.createElement('div');
  body.className = 'desc-panel-body';
  body.append(src.content.cloneNode(true));
  box.append(bar, body);
  wrap.append(scrim, box);
  document.body.append(wrap);

  const setAll = (open) => {
    for (const d of body.querySelectorAll('details.desc-branch')) d.open = open;
    track(open ? 'hierarchy_expand_all' : 'hierarchy_collapse_all');
  };
  expandBtn?.addEventListener('click', () => setAll(true));
  collapseBtn?.addEventListener('click', () => setAll(false));

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
    track('open_hierarchy');
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

  ({ reflect } = bindPanelHash('hierarchy', { open, close, isOpen }));

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
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  if (location.hash === '#hierarchy') open();
}
