// The Compare page at /compare/.
//
// A modder's folder is read in the browser and checked against the experimental
// script snapshot (data/experimental.json, built by src/experimental.js). The
// bytes here name no revision, so the page stays the same in every build.

import { layout } from '../html.js';

export function renderModCheck(ctx) {
  const content = /* html */ `
<div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
  <h1 class="m-0 text-lg leading-[var(--text-2xl--line-height)] text-accent font-semibold">Compare with</h1>
  <label class="select w-64">
    <span class="select-face" data-face="Experimental">
      <select id="modTarget" aria-label="Compare with">
        <option value="experimental" selected>Experimental</option>
        <option value="launched">Latest</option>
      </select>
    </span>
  </label>
</div>
<p>Check your mod against a build. Nothing is stored.</p>
<div class="mt-5 mb-8">
<div id="modDrop" role="button" tabindex="0" class="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-fg2 transition-colors duration-150 hover:border-accent2 hover:bg-bg2">
  <span class="pointer-events-none">Drag and drop files here</span>
  <span class="pointer-events-none">or click to select</span>
</div>
<input id="modFolder" type="file" webkitdirectory multiple hidden>
<div id="modResults"></div>
</div>
<div id="modFilters" class="flex flex-wrap gap-2 mb-6" hidden>
  <button type="button" class="btn" id="modIssues" aria-pressed="true">Needs a look</button>
  <button type="button" class="btn" id="modAll">Unchanged</button>
</div>
<div id="modList" aria-live="polite"></div>
<noscript><p>Choosing a folder needs JavaScript. The check still does not leave this browser.</p></noscript>`;
  return layout({
    ...ctx,
    title: 'Compare',
    active: 'compare/',
    description: 'Check a DayZ mod’s script overrides against the latest experimental or launched scripts. Runs locally; nothing is stored.',
    breadcrumbs: [{ label: 'Compare' }],
    content,
  });
}
