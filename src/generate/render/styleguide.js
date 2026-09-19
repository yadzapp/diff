// The styleguide at /styleguide/. Dev-only: a place to see shared UI and
// change it in one spot. Starts with chips; more components land here as
// they harden into a single class.

import { layout, SITE_TITLE } from '../html.js';

/** One specimen: the live control beside its class names. */
const row = (classes, html) =>
  `<tr><td class="sg-sample">${html}</td><td><code>${classes}</code></td></tr>`;

/** Whichever of near-black or white reads on this fill. */
const lum = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = lin(((n >> 16) & 255) / 255);
  const g = lin(((n >> 8) & 255) / 255);
  const b = lin((n & 255) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ink = (hex) => {
  const L = lum(hex);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (lum('#12160f') + 0.05) ? '#ffffff' : '#12160f';
};

const swatch = (hex) =>
  `<span class="sg-swatch" style="background:${hex};color:${ink(hex)}">${hex}</span>`;

const color = (token, light, dark) =>
  `<div class="sg-pair"><code>${token}</code><span class="sg-halves">${swatch(light)}${swatch(dark)}</span></div>`;

/** Size and line-height — utilities from @theme in site/styles.css. */
const TYPE = [
  ['text-xs', '12px', 'calc(1 / 0.75)'],
  ['text-sm', '14px', 'calc(1.25 / 0.875)'],
  ['text-base', '16px', 'calc(1.5 / 1)'],
  ['text-lg', '20px', 'calc(1.75 / 1.25)'],
  ['text-xl', '24px', 'calc(2 / 1.5)'],
  ['text-2xl', '32px', 'calc(2.5 / 2)'],
  ['text-3xl', '48px', 'calc(3.6 / 3)'],
];

const typeRow = ([name, size, leading]) =>
  `<div class="sg-type-row"><div class="sg-type-meta"><code>.${name}</code><span><code>--${name}</code> ${size}</span><span><code>--${name}--line-height</code> ${leading}</span></div><p class="sg-type-sample ${name}">The quick brown fox jumps over the lazy dog.</p></div>`;

const section = (id, title, body) =>
  `<details class="sg-sec" id="${id}"><summary class="sg-title">${title}</summary>\n${body}</details>`;

const COLORS = [
  ['--bg', '#ffffff', '#0e120c'],
  ['--bg2', '#f4f6f2', '#070b06'],
  ['--bg3', '#e9ede4', '#171c14'],
  ['--fg', '#12160f', '#c9d1d9'],
  ['--fg2', '#5d6b52', '#889083'],
  ['--fg3', '#9aa691', '#5a6356'],
  ['--line', '#dce0d5', '#2f372a'],
  ['--accent', '#2e4a33', '#b0c9b0'],
  ['--accent2', '#5d7a62', '#5d7a62'],
  ['--accent-bg', '#e6efe8', '#2e4a33'],
  ['--pin-hover-bg', '#ffffff', '#171c14'],
  ['--code-bg', '#f4f6f2', '#000000'],
  ['--kw', '#8a4b8c', '#cc99cd'],
  ['--str', '#2f7d4f', '#7ec699'],
  ['--num', '#a35c00', '#e08000'],
  ['--com', '#6a708a', '#717790'],
  ['--fn', '#2f6bab', '#79c0ff'],
  ['--pre', '#2b7f76', '#65cabe'],
  ['--pre-bg', '#e5f2f0', '#102a27'],
  ['--warn-bg', '#fbf8d4', '#2a2710'],
  ['--warn-line', '#c4b000', '#e3b341'],
  ['--note-bg', '#eaf2fb', '#10202f'],
  ['--note-line', '#2f6bab', '#79c0ff'],
  ['--added', '#2f7d4f', '#7ec699'],
  ['--removed', '#b03a3a', '#e08080'],
  ['--edited', '#b77900', '#e3b341'],
];

/**
 * Catalogue of shared UI. Identical across builds (no site model), so it
 * hard-links the same way /about/ does. Only rendered when development is on.
 */
export function renderStyleguide(ctx) {
  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Styleguide</h1>

${section(
  'colors',
  'Colors',
  `<p class="sg-src"><code>site/styles/tokens.css</code></p>
<div class="sg-colors">
<div class="sg-pair sg-colors-head"><span></span><span class="sg-halves"><span>Light</span><span>Dark</span></span></div>
${COLORS.map(([token, light, dark]) => color(token, light, dark)).join('\n')}
</div>`
)}

${section(
  'typography',
  'Typography',
  `<p class="sg-src"><code>site/styles.css</code> (@theme)</p>
<div class="sg-type">
${TYPE.map(typeRow).join('\n')}
</div>`
)}

${section(
  'tag',
  'Tag',
  `<p class="sg-src"><code>site/app/tag.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('note-tag', '<span class="note-tag">Community note</span>')}
${row('note-tag note-tag-note', '<span class="note-tag note-tag-note">Archive</span>')}
${row('note-tag note-tag-warn', '<span class="note-tag note-tag-warn">Warning</span>')}
${row('note-tag note-tag-removed', '<span class="note-tag note-tag-removed">Removed</span>')}
</tbody>
</table>`
)}

${section(
  'chip',
  'Chip',
  `<p class="sg-src"><code>site/app/chip.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('chip', '<a class="chip" href="#">Chip</a>')}
${row('chip chip-added', '<a class="chip chip-added" href="#">Added in 1.20</a>')}
${row('chip chip-changed', '<a class="chip chip-changed" href="#">Changed in 1.28</a>')}
${row('chip chip-removed', '<a class="chip chip-removed" href="#">Removed in 1.29</a>')}
</tbody>
</table>`
)}

${section(
  'button',
  'Button',
  `<p class="sg-src"><code>site/app/button.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('btn', '<button type="button" class="btn">Additions</button>')}
${row('btn · aria-pressed', '<button type="button" class="btn" aria-pressed="true">Removals</button>')}
</tbody>
</table>`
)}

${section(
  'icon-button',
  'Icon Button',
  `<p class="sg-src"><code>site/app/icon-button.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('icon-btn', '<button type="button" class="icon-btn" aria-label="Hide sidebar"><i class="ic ic-panel"></i></button>')}
${row('icon-btn icon-btn-sm', '<button type="button" class="icon-btn icon-btn-sm" aria-label="Pin"><i class="ic ic-pin"></i></button>')}
${row('icon-btn icon-btn-solid', '<button type="button" class="icon-btn icon-btn-solid" aria-label="Reset"><i class="ic ic-swap"></i></button>')}
${row('icon-btn icon-btn-solid · disabled', '<button type="button" class="icon-btn icon-btn-solid" disabled aria-label="Reset"><i class="ic ic-swap"></i></button>')}
${row('icon-btn icon-btn-lg', '<button type="button" class="icon-btn icon-btn-lg" aria-label="Back to top"><i class="ic ic-chev"></i></button>')}
</tbody>
</table>`
)}

${section(
  'select',
  'Select',
  `<p class="sg-src"><code>site/app/select.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('select', '<label class="select"><span class="select-kicker">To</span><span class="select-face" data-face="1.29 Update 4"><select aria-label="Compare to build"><option>1.29 Update 4</option><option>1.29 Update 3</option></select></span></label>')}
${row('select-ghost', '<button type="button" class="select-ghost" aria-haspopup="true"><span>1.29 Update 4</span><i class="ic ic-chev"></i></button>')}
</tbody>
</table>`
)}

${section(
  'tooltip',
  'Tooltip',
  `<p class="sg-src"><code>site/app/tooltip.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Attrs</th></tr></thead>
<tbody>
${row('data-tip', '<a class="chip" href="#" data-tip="A short hint">Hover</a>')}
${row('data-tip · data-key', '<button type="button" class="chip" data-tip="Toggle theme" data-key="M" aria-label="Toggle theme">Shortcut</button>')}
${row('data-tip · external', '<a class="chip" href="#" target="_blank" rel="noopener" data-tip="Opens on GitHub">External</a>')}
</tbody>
</table>`
)}

${section(
  'banner',
  'Banner',
  `<p class="sg-src"><code>site/app/banner.js</code></p>
<table class="list sg-table">
<thead><tr><th>Specimen</th><th>Classes</th></tr></thead>
<tbody>
${row('doc-note stale-banner', '<p class="doc-note stale-banner"><span class="note-tag note-tag-note">Archive</span> This class differs from the latest. <a href="#">View latest</a>.</p>')}
${row('doc-removed stale-banner', '<p class="doc-removed stale-banner"><span class="note-tag note-tag-removed">Removed</span> This class was removed in 1.29 Update 3. <a href="#">View latest</a>.</p>')}
</tbody>
</table>`
)}`;

  return layout({
    ...ctx,
    title: 'Styleguide',
    active: 'styleguide/',
    description: `UI styleguide for ${SITE_TITLE}`,
    breadcrumbs: [{ label: 'Styleguide' }],
    content,
  });
}
