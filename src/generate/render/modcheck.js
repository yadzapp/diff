// The Compare page at /changelog/compare/.
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
<p>Check your mod against a build. Nothing is stored.<span data-mod-hint><br>Drag and drop files here, or select files below:</span></p>
<button type="button" class="btn mt-3 inline-flex items-center gap-1.5" data-mod-select><i class="ic ic-upload" aria-hidden="true"></i>Select mod</button>
<input id="modFolder" type="file" webkitdirectory multiple hidden>
<div id="modResults" class="mt-5"></div>
<div id="modList" aria-live="polite"></div>
<noscript><p>Choosing a folder needs JavaScript. The check still does not leave this browser.</p></noscript>`;
  return layout({
    ...ctx,
    title: 'Compare',
    active: 'changelog/compare/',
    description: 'Check a DayZ mod’s script overrides against experimental or the latest scripts. Runs locally; nothing is stored.',
    breadcrumbs: [{ label: 'Compare' }],
    content,
  });
}
