import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReleaseNotes } from '../src/sync-release-notes.js';

test('wiki parser keeps only PC Stable notes as plain text', () => {
  const html = `
    <article id="PC-0">
      <details>
        <summary>Stable 1.29 Update 2 - Version 1.29.163709 (12 August 2026)<sup><a href="#cite_note-1">[1]</a></sup></summary>
        <b>GENERAL GAME</b>
        <p><b>FIXED</b></p>
        <ul><li>A <a href="/wiki/Server">server</a> crash</li><li>Broken tents</li></ul>
      </details>
      <details><summary>Experimental - Version 1.29.163700</summary><b>FIXED</b><ul><li>Ignored</li></ul></details>
    </article>
    <article id="Xbox-0"><details><summary>Stable - Version 1.29.999999</summary></details></article>
    <ol><li id="cite_note-1"><a href="https://forums.dayz.com/topic/1/#comment-2">Official notes</a></li></ol>`;

  assert.deepEqual(parseReleaseNotes(html, '1.29', 123), {
    '1.29.163709': {
      title: 'Stable 1.29 Update 2 - Version 1.29.163709 (12 August 2026)',
      date: '2026-08-12',
      forumUrl: 'https://forums.dayz.com/topic/1/#comment-2',
      wikiUrl: 'https://dayz.wiki.gg/wiki/Update_1.29',
      wikiRevision: 123,
      sections: [
        { heading: 'GENERAL GAME', items: [] },
        { heading: 'FIXED', items: ['A server crash', 'Broken tents'] },
      ],
    },
  });
});
