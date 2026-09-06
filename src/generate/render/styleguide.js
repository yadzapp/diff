// The styleguide at /styleguide/. Dev-only: a place to see shared UI and
// change it in one spot. Starts with chips; more components land here as
// they harden into a single class.

import { layout, SITE_TITLE } from '../html.js';

/** One specimen: the live control beside its class names. */
const row = (classes, html) =>
  `<tr><td class="sg-sample">${html}</td><td><code>${classes}</code></td></tr>`;

/**
 * Catalogue of shared UI. Identical across builds (no site model), so it
 * hard-links the same way /about/ does. Only rendered when development is on.
 */
export function renderStyleguide(ctx) {
  const content = /* html */ `
<h1>Styleguide</h1>

<h2 id="chips" class="sg-title">Chips</h2>
<p class="sg-src"><code>site/app/chip.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('chip', '<a class="chip" href="#">Chip</a>')}
${row('chip chip-added', '<a class="chip chip-added" href="#">Added in 1.20</a>')}
${row('chip chip-changed', '<a class="chip chip-changed" href="#">Changed in 1.28</a>')}
</tbody>
</table>

<h2 id="tooltips" class="sg-title">Tooltips</h2>
<p class="sg-src"><code>site/app/tooltip.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Attrs</th></tr></thead>
<tbody>
${row('data-tip', '<a class="chip" href="#" data-tip="A short hint">Hover</a>')}
${row('data-tip · data-key', '<button type="button" class="chip" data-tip="Toggle theme" data-key="M" aria-label="Toggle theme">Shortcut</button>')}
${row('data-tip · external', '<a class="chip" href="#" target="_blank" rel="noopener" data-tip="Opens on GitHub">External</a>')}
</tbody>
</table>`;

  return layout({
    ...ctx,
    title: 'Styleguide',
    active: 'styleguide/',
    description: `UI styleguide for ${SITE_TITLE}`,
    breadcrumbs: [{ label: 'Styleguide' }],
    content,
  });
}
