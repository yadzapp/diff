/* The client. Every feature lives in its own module under site/app/; this
   file is the list of them, in the order they run.

   Each init below is guarded by whether the thing it works on is on the page,
   so on any one page most of them do nothing: the source view only runs on
   /files/…/, the notes only on a class or enum, the minimap only where there
   is code to map. That is why one script serves all ~660,000 pages.

   A throw from one feature used to stop every init listed after it — the page
   looked half-dead with only a console entry to say why. boot() keeps the
   rest running and names the feature that failed.

   Loaded as a module (see layout() in src/generate/html.js), so it is
   deferred and the page is fully parsed before any of this runs. */

import { initTheme } from './app/theme.js';
import { initNav } from './app/nav.js';
import { initSidebar } from './app/sidebar.js';
import { initBuilds, initVersionPicker, initStalePage } from './app/builds.js';
import { recordVisit } from './app/recent.js';
import { initSearch } from './app/search.js';
import { initShortcuts } from './app/shortcuts.js';
import { initChangelog } from './app/changelog.js';
import { initModCheck } from './app/modcheck.js';
import { initWorkshop, initCards } from './app/workshop.js';
import { initSourceView } from './app/source.js';
import { initShare } from './app/share.js';
import { initInlineCode } from './app/highlight.js';
import { initHistory } from './app/history.js';
import { initDescendants } from './app/descendants.js';
import { initNotes } from './app/notes.js';
import { initGlossary } from './app/glossary.js';
import { initTooltip } from './app/tooltip.js';
import { initCopyBlocks, initCopySignatures } from './app/copy.js';
import { initLlmCopy } from './app/llm.js';
import { initXrefs } from './app/xrefs.js';
import { initPageBar } from './app/pagebar.js';
import { initFileTree } from './app/filetree.js';
import { initAllMembers, initFullMembersPanel, initFieldsIndex } from './app/members.js';
import { initCredits } from './app/credits.js';
import { initToc } from './app/toc.js';
import { initMinimap } from './app/minimap.js';
import { initSwap } from './app/swap.js';
import { initStyleguide } from './app/styleguide.js';

/** Run a feature init; a throw must not take the rest of the page with it. */
function boot(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[app] ${name} failed`, err);
  }
}

// the chrome: header, navigation, and which build this page is
boot('theme', initTheme);
boot('nav', initNav);
boot('sidebar', initSidebar);
boot('builds', initBuilds);
boot('version-picker', initVersionPicker);

// finding things
boot('recent', recordVisit);
boot('search', initSearch);
boot('shortcuts', initShortcuts);

// the source view, and the one page that fetches its own behaviour
boot('changelog', initChangelog);
boot('mod-check', initModCheck);
boot('cards', initCards);
boot('workshop', initWorkshop);
boot('source', initSourceView);
boot('share', initShare);
boot('inline-code', initInlineCode);
boot('styleguide', initStyleguide);

// what gets added to a declaration once the page is up
const historyReady = boot('history', initHistory);
boot('descendants', initDescendants);
boot('full-members', initFullMembersPanel);
const titleActions = document.querySelector('h1.class-title .title-actions');
if (titleActions) titleActions.hidden = true;
const notesReady = boot('notes', initNotes);
boot('stale-page', initStalePage);
// before the tooltip: the glossary lays data-tip on a keyword during the
// same pointerover the tooltip then reads it on
boot('glossary', initGlossary);
boot('tooltip', initTooltip);
boot('copy-blocks', initCopyBlocks);
boot('copy-signatures', initCopySignatures);
boot('llm-copy', initLlmCopy);
boot('xrefs', initXrefs);
Promise.allSettled([historyReady, notesReady]).then(() => {
  if (titleActions) titleActions.hidden = false;
});

// moving around a long page
boot('page-bar', initPageBar);
boot('file-tree', initFileTree);
boot('all-members', initAllMembers);
boot('fields-index', initFieldsIndex);
boot('credits', initCredits);
boot('toc', initToc);
boot('minimap', initMinimap);

// last: from here on, moving between source files replaces the listing above
// rather than the document, and runs the relevant few of these again
boot('swap', initSwap);
