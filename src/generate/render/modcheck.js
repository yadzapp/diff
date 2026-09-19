// The Compare page at /compare/.
//
// A modder's folder is read in the browser and checked against the experimental
// script snapshot (data/experimental.json, built by src/experimental.js). The
// bytes here name no revision, so the page stays the same in every build.

import { esc, layout, EXT } from '../html.js';

const REPO = 'https://github.com/BohemiaInteractive/DayZ-Script-Diff-Experimental';

export function renderModCheck(ctx) {
  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Compare</h1>
<p>Check a mod against the latest <a href="${esc(REPO)}" ${EXT}>experimental scripts</a> or the latest launched build. Pick the project folder — the P: drive or the repo — and this page reads it here. Nothing is stored.</p>
<label class="select mt-5 w-64">
  <span class="select-face" data-face="Experimental">
    <select id="modTarget" aria-label="Compare against">
      <option value="experimental" selected>Experimental</option>
      <option value="launched">Launched</option>
    </select>
  </span>
</label>
<label id="modDrop" class="mt-5 mb-8 flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line px-6 py-10 text-center transition-colors duration-150 hover:border-accent2 hover:bg-bg2">
  <span>Drag and drop files here</span>
  <span class="text-sm text-fg2">or click to select</span>
  <input id="modFolder" type="file" webkitdirectory multiple hidden>
</label>
<div id="modResults"></div>
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
