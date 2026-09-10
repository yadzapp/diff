// The about page at /about/.

import { layout, EXT } from '../html.js';
import { REPO_URL, YADZ_DISCORD, DPL_URL } from '../content.js';
import { linkCards } from './shared.js';

/** Machine-readable files agents should fetch instead of scraping HTML. */
const AGENT_LINKS = [
  ['llms.txt', '/llms.txt', 'Where agents start: what to fetch, and the license that covers it'],
  ['agent.md', '/agent.md', 'How to look a type up without scraping class pages'],
  ['api.json', '/api.json', 'Latest build: every class, method, field, enum, global, typedef and macro'],
  ['search.json', '/search.json', 'Compact name index the site search uses'],
  ['notes.json', '/assets/notes.json', 'Community notes, keyed by Type or Type.Member'],
  ['versions.json', '/assets/versions.json', 'Every documented PC build'],
  ['feed.xml', '/feed.xml', 'Atom feed of new PC stable builds'],
];

/**
 * What this site is, who builds it, how agents should read it, what it is made
 * of, and the terms the sources are shown under. Legal is the only place on
 * the site carrying that notice — there is no page footer — so the rail's link
 * to About is the way to it. The lists are hand-maintained in
 * src/generate/content.js. Nothing
 * here is derived from a build, so these bytes are identical across all of
 * them and the page keeps its hard link; see layout() in src/generate/html.js.
 */
export function renderAbout(ctx) {
  const content = /* html */ `
<h1>About</h1>
<p>DIFF stands for DayZ Internal File Finder.</p>
<p>It's a browsable documentation for the <a href="https://community.bistudio.com/wiki/DayZ:Enforce_Script_Syntax" ${EXT}>DayZ Enforce Script</a> sources. Every class, method, enum and constant, generated automatically from the official <a href="https://github.com/BohemiaInteractive/DayZ-Script-Diff" ${EXT}>repository</a>. It's <a href="${REPO_URL}" ${EXT}>open source</a> and built by the community.</p>
<p>Made for anyone wandering the DayZ modding and scripting world, and meant to be a quicker way to browse than the raw sources. Unfortunately, you won't find an official detailed documentation about this subject. This is just the tip of the iceberg, so community content is your best friend. Check the <a href="/community/">Community</a> tab, and if you join a Discord channel, make sure to check the pinned messages, as most recurring questions are answered there.</p>
<h2 id="collaborations">Collaborations</h2>
<p>Bug reports, suggestions, and community notes are welcome. Open an issue or a pull request on <a href="${REPO_URL}" ${EXT}>GitHub</a>, or leave a message on <a href="${YADZ_DISCORD}" ${EXT}>Discord</a>.</p>
<p id="notes">Most of the script API has no doc comment. A community note fills one in: a short annotation on a class, enum or member. What an argument expects, whether a call is server-only, what a method does that its name does not say. Notes show up on that declaration's page, labelled as community writing rather than Bohemia's, and on every build at once.</p>
<p>Community notes live in <code>notes.json</code> and it's easy to add or edit one. Add an entry by opening a pull request on <a href="${REPO_URL}" ${EXT}>GitHub</a>. Merged notes go live on the next deploy.</p>
<pre class="code"><code>{
  // Examples
  "<a href="/classes/ActionInteractBase/">ActionInteractBase</a>": "Press-to-interact world action (open a door, flip a switch): no item required, no progress bar.",
  "<a href="/classes/ActionSingleUseBase/">ActionSingleUseBase</a>": "One-press action with an animation (eating a pill, switching a light). The server-side effect usually goes in \`OnStartServer\`.",
  "<a href="/classes/PluginManager/">PluginManager</a>": "Creates and owns every \`PluginBase\` singleton, on server and client. The global \`GetPlugin(typename)\` is the front door.",
  "<a href="/classes/ItemBase/#OnCombine">ItemBase.OnCombine</a>": "Server-side stack merge — pouring one stack into another. \`other_item\` is the source stack.",
  "<a href="/classes/Object/#GetHealth01">Object.GetHealth01</a>": "Health normalized to 0..1 of the zone's maximum — handy for bars and thresholds without reading config maxima.",
  "<a href="/classes/CGame/#GetTime">CGame.GetTime</a>": "Mission time in milliseconds, monotonic since mission start. Good for cooldowns and timing; unrelated to the in-game calendar clock."
}</code></pre>
<h2 id="agents">Agents</h2>
<p>The HTML pages are for people. Agents should start at <a href="/llms.txt"><code>llms.txt</code></a> and fetch the JSON rather than scraping class pages. How to look a type up is in <a href="/agent.md"><code>agent.md</code></a>. <code>api.json</code> is latest-only; older builds keep the HTML archive at <code>/v/&lt;label&gt;/</code> (e.g. <code>/v/129u3/</code>). The script sources it describes are under the DPL; community notes are not.</p>
<p>For pasting into a chat by hand, every class and enum page has a Copy for LLM button under its title: the page as Markdown — signatures, inheritance, docs and community notes — with its build and source named.</p>
${linkCards(AGENT_LINKS)}
<h2 id="colophon">Colophon</h2>
<p>DIFF is a custom static site generator: Node 20+, ES modules, and nothing to install. There is no bundler and no runtime dependency. A custom parser reads Enforce Script; the generator turns that into these pages; the browser runs plain modules out of <code>site/</code>.</p>
<p>Type is <a href="https://rsms.me/inter/" ${EXT}>Inter</a>, loaded from <a href="https://fonts.google.com/specimen/Inter" ${EXT}>Google Fonts</a> as a variable face with optical size, with the system UI stack behind it. Code, signatures and shortcuts use the platform monospace stack — ui-monospace, SF Mono, Cascadia Code, Menlo, Consolas.</p>
<p>The source lives on <a href="${REPO_URL}" ${EXT}>GitHub</a>. The site is hosted on <a href="https://www.netlify.com/" ${EXT}>Netlify</a>. It is written and edited in <a href="https://cursor.com/" ${EXT}>Cursor</a> with multiple LLMs. Who owns what, and under which terms, is in <a href="#legal">Legal</a>.</p>
<h2 id="legal">Legal</h2>
<p>This is not official documentation and is not affiliated with <a href="https://dayz.com/" ${EXT}>DayZ</a> or <a href="https://www.bohemia.net/" ${EXT}>Bohemia Interactive</a>.</p>
<p>The script sources shown here are © BOHEMIA INTERACTIVE a.s., all rights reserved, and are licensed under the <a href="${DPL_URL}" ${EXT}>DayZ Public License (DPL)</a>: non-commercial, DayZ-only reuse with attribution. They have been modified for presentation — parsed, reorganized and reformatted — from the originals in <a href="https://github.com/BohemiaInteractive/DayZ-Script-Diff/tree/main/scripts" ${EXT}>DayZ Script Diff</a>, and are offered as-is, without warranties of any kind. The generator itself is <a href="${REPO_URL}/blob/main/LICENSE" ${EXT}>MIT</a>, and that license does not extend to them.</p>
<p>Community notes and outbound links are community-made and carry their own licenses.</p>
<p>DAYZ®, ENFUSION® and BOHEMIA INTERACTIVE® are registered trademarks of BOHEMIA INTERACTIVE a.s. All other trademarks and copyrights are the property of their respective owners.</p>`;

  return layout({
    ...ctx,
    title: 'About',
    active: 'about/',
    description: 'About DIFF, the DayZ Internal File Finder: what this DayZ Scripts documentation is, how to collaborate, community notes, agents, and the stack.',
    breadcrumbs: [{ label: 'About' }],
    content,
  });
}
