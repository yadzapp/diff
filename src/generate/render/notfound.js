// The 404 page. Netlify serves it for every path it holds no file for.

import { layout } from '../html.js';

export function render404(ctx) {
  // Where a link from the old Doxygen site lands when it is not one of the
  // addresses _redirects knows. Naming that, and the sections it could have
  // been heading for, is the difference between a dead end and a detour.
  const content = /* html */ `
<h1>Page not found</h1>
<p>If you followed a link to the old DayZ Scripts site, most of its addresses redirect here — this one did not. Try the search:</p>
<button class="search-trigger search-cta" id="notfoundSearchBtn" type="button" aria-label="Search"><i class="ic ic-search"></i><span>Search for classes, methods, and more…</span><kbd>⌘K</kbd></button>
<p>Or start from the <a href="/classes/">class list</a>, the <a href="/files/">file list</a>, <a href="/globals/">globals</a> or <a href="/topics/">topics</a>.</p>`;
  // site/notfound.js reads the url and forwards a mis-cased one to the page it
  // names, which is why it belongs here and nowhere else.
  return layout({ ...ctx, title: 'Not found', noindex: true, script: 'notfound.js', content });
}
