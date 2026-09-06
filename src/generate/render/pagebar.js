/* The secondary bar every long page wears, under the site nav.
 *
 * Doxygen scattered these: a tab strip here, an A–Z row there, and each page
 * decided for itself where they went. Everything that acts on the page you
 * are already on is gathered into one strip instead, in one place, in one
 * order — so a reader learns where the controls are once, and a new control
 * is added here rather than in six renderers.
 *
 * A page asks for the parts it needs and layout() puts the result at the top
 * of <main>, above the title; see pageInner() in src/generate/html.js. It is
 * sticky, so it is still there once the page it narrows has scrolled past.
 *
 * A section's kinds — the Classes cuts, the Globals kinds — used to be a tab
 * strip here, which meant a reader only ever saw the cuts for the section they
 * had already chosen. They are branches of the rail now (NAV in
 * src/generate/html.js), so what is left is what acts on this page and this
 * page only: the members-index letters, and chips to narrow a list by.
 *
 * Behaviour is site/app/pagebar.js.
 */

import { esc } from '../html.js';

export const letterTitle = (l) => (l === '_' ? 'Other' : l.toUpperCase());

/** Letter strip, only on the members index — that list cannot fit on one page. */
const letterRow = ({ base, dir, list, current }) => {
  const links = [...list]
    .map((l) => {
      const text = l === '_' ? '#' : l.toUpperCase();
      const on = l === current;
      return `<a class="pb-letter${on ? ' active' : ''}" href="${base}${dir}${l}/"${on ? ' aria-current="page"' : ''}>${text}</a>`;
    })
    .join('');
  return /* html */ `<nav class="pb-letters" aria-label="By letter">${links}</nav>`;
};

const chipRow = (chips) =>
  /* html */ `<div class="pb-chips">${chips
    .map(
      ([mod, label], i) =>
        `<button type="button" class="pf${i ? '' : ' active'}" data-mod="${esc(mod)}" aria-pressed="${!i}">${esc(label)}</button>`
    )
    .join('')}</div>`;

/**
 * Build a page's bar. Everything is optional; a page passes only the parts it
 * has, and a page with none of them gets no bar at all.
 *
 * - `chips`   [modifier, label][] — what the list can be narrowed to
 * - `letters` { base, dir, list, current } — the members-index letters
 *
 * Letters get a row of their own: twenty-seven of them never fit beside
 * anything, and a strip is how they stay visible.
 */
export function pageBar({ chips, letters } = {}) {
  const row = chips?.length ? chipRow(chips) : '';
  const az = letters ? letterRow(letters) : '';
  if (!row && !az) return '';
  return `<div class="pagebar">${row ? `<div class="pb-row">${row}</div>` : ''}${az}</div>`;
}
