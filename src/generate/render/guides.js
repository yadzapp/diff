import { layout, linkedH2 } from '../html.js';
import { LEARN_LINKS } from '../content.js';
import { linkCards } from './shared.js';

const GUIDES = [
  ['Script layers', 'script-layers/', 'How 1_Core through 5_Mission compose, and what belongs in each layer'],
  ['Engine APIs and script code', 'engine-and-script/', 'How to tell engine declarations, callbacks and readable script implementations apart'],
  ['Inheritance and entry points', 'inheritance/', 'Where to open the class tree when you need a player, item, action, mission or plugin'],
];

const typeLink = (base, name, label = name) => `<a href="${base}classes/${name}/"><code>${label}</code></a>`;
const layerLink = (base, name) => `<a href="${base}files/${name}/"><code>${name}</code></a>`;
const topicLink = (base, name, label = name) => `<a href="${base}topics/${name}/">${label}</a>`;
const guideLink = (base, href, label) => `<a href="${base}guides/${href}">${label}</a>`;

function furtherReading(base) {
  return /* html */ `
${linkedH2('further-reading', 'Further reading')}
<p>Official setup and community teaching live on <a href="${base}community/">Community</a>. Start there for Discord, samples and videos; use the maps above when you are already inside the API.</p>
${linkCards(LEARN_LINKS, true)}`;
}

export function renderGuidesIndex(ctx) {
  const { base } = ctx;
  const links = GUIDES.map(([title, href, description]) => [title, base + 'guides/' + href, description]);
  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Guides</h1>
<p>Conceptual maps for the DayZ script API. Use these when a class list tells you what exists but not how the pieces fit together.</p>
${linkCards(links)}
${linkedH2('path', 'Outside DIFF')}
<p>Start with the official walkthrough, then watch a long-form intro, then ask where people already answer. Deeper wikis, Discords and tooling stay on <a href="${base}community/#learn">Community · Learn</a>.</p>
${linkCards(LEARN_LINKS, true)}`;

  return layout({
    ...ctx,
    title: 'Guides',
    active: 'guides/',
    description: 'Conceptual guides to the DayZ script API.',
    breadcrumbs: [{ label: 'Guides' }],
    content,
  });
}

export function renderScriptLayersGuide(ctx) {
  const { base } = ctx;
  const content = /* html */ `
<div class="class-doc">
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Script layers</h1>
<p>DayZ ships its Enforce Script in five compiled modules, loaded in order: ${layerLink(base, '1_Core')} → ${layerLink(base, '2_GameLib')} → ${layerLink(base, '3_Game')} → ${layerLink(base, '4_World')} → ${layerLink(base, '5_Mission')}. Each layer can build on the types loaded before it. The folder is therefore part of the architecture, not just file organisation.</p>
<p>This guide describes what the current source corpus contains. It is a map for reading and modding the scripts, not a specification of engine internals.</p>

<table class="list doc-table">
<thead><tr><th>Layer</th><th>What you will find there</th><th>Start with</th></tr></thead>
<tbody>
<tr><td>${layerLink(base, '1_Core')}</td><td>Language/runtime primitives and the broad engine API surface</td><td>${typeLink(base, 'ScriptModule')}, ${typeLink(base, 'IEntity')}, ${typeLink(base, 'Widget')}</td></tr>
<tr><td>${layerLink(base, '2_GameLib')}</td><td>Generic game entities, components, managers and shared utilities</td><td>${typeLink(base, 'Game')}, ${typeLink(base, 'ScriptComponent')}, ${typeLink(base, 'ScriptCallQueue')}</td></tr>
<tr><td>${layerLink(base, '3_Game')}</td><td>DayZ-facing engine facade, shared systems and entity roots</td><td>${typeLink(base, 'CGame')}, ${typeLink(base, 'DayZGame')}, ${typeLink(base, 'EntityAI')}</td></tr>
<tr><td>${layerLink(base, '4_World')}</td><td>Most gameplay implementations: items, actions, recipes, players and plugins</td><td>${typeLink(base, 'ItemBase')}, ${typeLink(base, 'PlayerBase')}, ${typeLink(base, 'ActionBase')}</td></tr>
<tr><td>${layerLink(base, '5_Mission')}</td><td>Mission lifecycle, client HUD, menus and server mission hooks</td><td>${typeLink(base, 'MissionServer')}, ${typeLink(base, 'MissionGameplay')}, ${typeLink(base, 'UIScriptedMenu')}</td></tr>
</tbody>
</table>

<h2 id="composition" class="text-lg mt-16 mb-4 font-semibold">How the layers compose</h2>
<p>A later module can refer to declarations from an earlier one. That is why the entity chain crosses folders: ${typeLink(base, 'IEntity')} begins in 1_Core, ${typeLink(base, 'Object')} and ${typeLink(base, 'EntityAI')} continue it in 3_Game, and types such as ${typeLink(base, 'ItemBase')} and ${typeLink(base, 'PlayerBase')} implement gameplay in 4_World.</p>
<p>Load order also affects globals with the same name. The generic <code>GetGame()</code> from 2_GameLib is superseded by the DayZ-facing version in 3_Game, whose return type is ${typeLink(base, 'DayZGame')}.</p>
<p>The ${typeLink(base, 'ScriptModule')} notes document an important boundary: <code>modded</code> does not patch a class that has already been compiled in another module. Put a modification where its dependencies and target class are available instead of treating all five folders as one compilation unit.</p>

<h2 id="core" class="text-lg mt-16 mb-4 font-semibold">1_Core: runtime and engine contracts</h2>
<p>${layerLink(base, '1_Core')} contains the roots that the rest of the script API builds on. Its <code>proto</code> files declare engine-provided entities, widgets, math, serialisation, reflection and Workbench APIs. Representative types include ${typeLink(base, 'Managed')}, ${typeLink(base, 'IEntity')}, ${typeLink(base, 'Math')}, ${typeLink(base, 'Serializer')} and ${typeLink(base, 'Widget')}.</p>
<p>Many methods here are declarations whose implementation lives inside the engine. The source page can show their signature, but there is no script body to inspect. See ${guideLink(base, 'engine-and-script/', 'Engine APIs and script code')} before choosing an override point.</p>
<p>Related topics: ${topicLink(base, 'Math', 'Math')}, ${topicLink(base, 'Physics', 'Physics')} and ${topicLink(base, 'WidgetAPI', 'Widget UI system')}.</p>

<h2 id="gamelib" class="text-lg mt-16 mb-4 font-semibold">2_GameLib: shared game library</h2>
<p>${layerLink(base, '2_GameLib')} is a small bridge between core engine types and DayZ-specific systems. It contains generic entity and component classes, input and menu managers, callback utilities, cameras and a script testing framework.</p>
<p>${typeLink(base, 'ScriptCallQueue')} and ${typeLink(base, 'ScriptInvoker')} are common utilities from this layer. ${typeLink(base, 'GenericEntity')} and ${typeLink(base, 'ScriptComponent')} provide generic building blocks that later game code specialises.</p>
<p>Related topic: ${topicLink(base, 'ScriptTestingFramework', 'Script Testing Framework')}.</p>

<h2 id="game" class="text-lg mt-16 mb-4 font-semibold">3_Game: the DayZ-facing game layer</h2>
<p>${layerLink(base, '3_Game')} connects the generic engine API to DayZ. It contains ${typeLink(base, 'CGame')} and ${typeLink(base, 'DayZGame')}, shared inventory and weather systems, Central Economy and hive interfaces, enums, GUI foundations, and the entity roots used by 4_World.</p>
<p>The chain ${typeLink(base, 'Object')} → ${typeLink(base, 'Entity')} → ${typeLink(base, 'EntityAI')} lives here. ${typeLink(base, 'DayZPlayer')} is the engine-facing player base; the readable gameplay implementation continues in 4_World.</p>
<p>Related topics: ${topicLink(base, 'RPC', 'RPC')}, ${topicLink(base, 'Vehicle', 'Vehicles')} and ${topicLink(base, 'EnvironmentCfg', 'Environment configuration')}.</p>

<h2 id="world" class="text-lg mt-16 mb-4 font-semibold">4_World: gameplay implementation</h2>
<p>${layerLink(base, '4_World')} contains most of the scripts and most of the code modders read or extend: items, firearms, actions, recipes, player modifiers, creatures, vehicles, base building and plugin services.</p>
<p>Common entry points include ${typeLink(base, 'PlayerBase')}, ${typeLink(base, 'ItemBase')}, ${typeLink(base, 'ActionBase')}, ${typeLink(base, 'Weapon_Base')}, ${typeLink(base, 'ZombieBase')}, ${typeLink(base, 'CarScript')}, ${typeLink(base, 'RecipeBase')} and ${typeLink(base, 'PluginBase')}.</p>
<p>Cross-layer stacks become concrete here. For example, ${typeLink(base, 'DayZPlayer')} from 3_Game is extended by ${typeLink(base, 'DayZPlayerImplement')}, ${typeLink(base, 'ManBase')} and finally ${typeLink(base, 'PlayerBase')} in 4_World. See ${guideLink(base, 'inheritance/', 'Inheritance and entry points')} for the other common stacks.</p>

<h2 id="mission" class="text-lg mt-16 mb-4 font-semibold">5_Mission: lifecycle and interface</h2>
<p>${layerLink(base, '5_Mission')} is the top loaded module. It contains the mission lifecycle and most of the in-game UI: server connection and spawn handling, the client gameplay mission, HUD, inventory and menu screens, and intro scenes.</p>
<p>${typeLink(base, 'MissionServer')} is the server mission entry point. ${typeLink(base, 'MissionGameplay')} owns client-side gameplay updates and input. ${typeLink(base, 'UIScriptedMenu')} and ${typeLink(base, 'IngameHud')} anchor much of the interface layer.</p>

<h2 id="outside" class="text-lg mt-16 mb-4 font-semibold">Outside the five layers</h2>
<p>The source tree also contains <code>editor/</code> and standalone documentation files. They are useful to browse, but they are not additional steps in the five-module runtime order described above.</p>
${furtherReading(base)}
</div>`;

  return layout({
    ...ctx,
    title: 'Script layers',
    active: 'guides/',
    description: 'How 1_Core through 5_Mission compose in the DayZ script API.',
    breadcrumbs: [
      { label: 'Guides', href: `${base}guides/` },
      { label: 'Script layers' },
    ],
    content,
  });
}

export function renderEngineAndScriptGuide(ctx) {
  const { base } = ctx;
  const content = /* html */ `
<div class="class-doc">
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Engine APIs and script code</h1>
<p>DIFF documents the script files that DayZ ships. Some of those files contain readable Enforce Script implementations; others declare contracts implemented inside the engine. A visible signature does not always mean there is a script body to copy or override.</p>

<table class="list doc-table">
<thead><tr><th>Form</th><th>What it means here</th><th>What to do</th></tr></thead>
<tbody>
<tr><td><code>proto</code></td><td>Declared in script and implemented by the engine</td><td>Call it as documented; there is no script body to inspect</td></tr>
<tr><td><code>proto native</code></td><td>Engine implementation using the native calling convention</td><td>Do not treat it as an overrideable script method</td></tr>
<tr><td><code>event</code></td><td>A callback the engine invokes on a script object</td><td>Override after <code>SetEventMask</code> opts the entity in. Do not call <code>super</code> on <code>IEntity</code> <code>EOn*</code> events — the original already runs</td></tr>
<tr><td>Method with a body</td><td>Readable script implementation</td><td>Follow its calls and callers; extend it with inheritance or <code>modded class</code> where allowed</td></tr>
</tbody>
</table>

<h2 id="declarations" class="text-lg mt-16 mb-4 font-semibold">Engine declarations</h2>
<p>A <code>proto</code> method is the script-facing edge of engine code. DIFF can show its modifiers, parameters, return type, documentation and references, but the C++ implementation is outside the DayZ Script Diff corpus.</p>
<p>${typeLink(base, 'Widget')} and ${typeLink(base, 'Math')} are declaration-heavy examples. ${typeLink(base, 'IEntity')} mixes engine methods with <code>event</code> callbacks such as frame, initialisation and contact events.</p>

<h2 id="implementations" class="text-lg mt-16 mb-4 font-semibold">Script implementations</h2>
<p>A normal method with braces has a body in the source viewer. Start from its <strong>src</strong> link, then use <strong>References</strong> and <strong>Referenced by</strong> to follow the local behaviour. ${typeLink(base, 'EntityAI')}, ${typeLink(base, 'ItemBase')} and ${typeLink(base, 'PlayerBase')} expose progressively more DayZ-specific script logic across 3_Game and 4_World.</p>
<p>Engine-backed types and script implementations often form one inheritance chain. The boundary is not “engine class versus script class” by name; inspect the declaration and its modifiers member by member. ${guideLink(base, 'inheritance/', 'Inheritance and entry points')} lists the stacks modders open most often.</p>

<h2 id="callbacks" class="text-lg mt-16 mb-4 font-semibold">Callbacks and extension points</h2>
<p><code>event</code> marks a callback initiated by the engine. Script classes also define ordinary override hooks such as the <code>EE*</code> methods on ${typeLink(base, 'EntityAI')}. These are useful entry points because their script bodies and callers reveal how vanilla composes the behaviour. On ${typeLink(base, 'IEntity')} <code>EOn*</code> events, skip <code>super</code>: the original is invoked regardless, and a super call only adds overhead.</p>
<p><code>modded class</code> layers a rewrite over a class in the same compiled module, with <code>super</code> still reaching the previous implementation. Module boundaries matter: read ${guideLink(base, 'script-layers/', 'Script layers')} before deciding where a patch belongs.</p>

<h2 id="version-defines" class="text-lg mt-16 mb-4 font-semibold">Version defines</h2>
<p>The compiler defines <code>DAYZ_X_XX</code> as the current major.minor, for example <code>DAYZ_1_29</code> on 1.29. When experimental deprecates an API, wrap the old call in <code>#ifdef DAYZ_1_28</code> and the new one in <code>#else</code> so one PBO still builds against both until stable ships, then delete the dead branch.</p>

<h2 id="reading" class="text-lg mt-16 mb-4 font-semibold">A practical reading path</h2>
<ol>
  <li>Open the class page and identify its inheritance chain and source locations.</li>
  <li>Check whether the member is <code>proto</code>, <code>native</code>, <code>event</code>, or a method with a body.</li>
  <li>For script code, open <strong>src</strong> and follow References and Referenced by.</li>
  <li>For engine declarations, rely on the documented contract and examples in script callers rather than searching for a missing body.</li>
  <li>Check the class's layer before using inheritance or <code>modded class</code>.</li>
</ol>
<p>Compare ${typeLink(base, 'ScriptCallQueue')}, an engine-facing utility whose callers demonstrate normal use, with ${typeLink(base, 'MissionServer')}, a script implementation intended to participate in mission lifecycle behaviour.</p>

<h2 id="scope" class="text-lg mt-16 mb-4 font-semibold">What DIFF cannot show</h2>
<p>DIFF does not contain DayZ's engine internals. It can document exported declarations and the script code that calls them, but it cannot reveal an engine method's internal algorithm, thread model or side effects unless the published contract or observable script usage explains them.</p>
${furtherReading(base)}
</div>`;

  return layout({
    ...ctx,
    title: 'Engine APIs and script code',
    active: 'guides/',
    description: 'How to distinguish engine declarations from DayZ script implementations.',
    breadcrumbs: [
      { label: 'Guides', href: `${base}guides/` },
      { label: 'Engine APIs and script code' },
    ],
    content,
  });
}

export function renderInheritanceGuide(ctx) {
  const { base } = ctx;
  const content = /* html */ `
<div class="class-doc">
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Inheritance and entry points</h1>
<p>Home lists common classes. This guide says which stack each belongs to, and which type to open first when you need a player hook, an item behaviour, an action, a mission lifecycle change or a game-wide service.</p>
<p>Read ${guideLink(base, 'script-layers/', 'Script layers')} for module boundaries and ${guideLink(base, 'engine-and-script/', 'Engine APIs and script code')} before treating every method as overrideable script.</p>

<table class="list doc-table">
<thead><tr><th>You need…</th><th>Open first</th><th>Then follow</th></tr></thead>
<tbody>
<tr><td>Player behaviour</td><td>${typeLink(base, 'PlayerBase')}</td><td>${typeLink(base, 'DayZPlayerImplement')} · ${typeLink(base, 'DayZPlayer')} · ${typeLink(base, 'EntityAI')}</td></tr>
<tr><td>Item behaviour</td><td>${typeLink(base, 'ItemBase')}</td><td>${typeLink(base, 'Inventory_Base')} (config) · ${typeLink(base, 'EntityAI')}</td></tr>
<tr><td>Player action</td><td>${typeLink(base, 'ActionBase')}</td><td>${typeLink(base, 'ActionContinuousBase')} · ${typeLink(base, 'ActionInteractBase')} · ${typeLink(base, 'ActionSingleUseBase')}</td></tr>
<tr><td>Firearm</td><td>${typeLink(base, 'Weapon_Base')}</td><td>${typeLink(base, 'ItemBase')} · weapon state machines in 4_World</td></tr>
<tr><td>Vehicle</td><td>${typeLink(base, 'CarScript')}</td><td>${topicLink(base, 'Vehicle', 'Vehicles')}</td></tr>
<tr><td>Handcrafting</td><td>${typeLink(base, 'RecipeBase')}</td><td>Vanilla recipes beside it in 4_World</td></tr>
<tr><td>Server / client mission</td><td>${typeLink(base, 'MissionServer')} / ${typeLink(base, 'MissionGameplay')}</td><td>${typeLink(base, 'MissionBase')}</td></tr>
<tr><td>HUD or menu</td><td>${typeLink(base, 'IngameHud')} / ${typeLink(base, 'UIScriptedMenu')}</td><td>${typeLink(base, 'Widget')} · ${topicLink(base, 'WidgetAPI', 'Widget UI')}</td></tr>
<tr><td>Game-wide service</td><td>${typeLink(base, 'PluginBase')}</td><td>${typeLink(base, 'PluginManager')} · <code>GetPlugin</code></td></tr>
<tr><td>Engine facade</td><td>${typeLink(base, 'CGame')} / ${typeLink(base, 'DayZGame')}</td><td><code>GetGame()</code> callers</td></tr>
</tbody>
</table>

<h2 id="player" class="text-lg mt-16 mb-4 font-semibold">Player stack</h2>
<p>The living player is one inheritance chain that crosses layers:</p>
<p>${typeLink(base, 'IEntity')} → ${typeLink(base, 'Object')} → ${typeLink(base, 'Entity')} → ${typeLink(base, 'EntityAI')} → ${typeLink(base, 'Man')} → ${typeLink(base, 'DayZPlayer')} → ${typeLink(base, 'DayZPlayerImplement')} → ${typeLink(base, 'ManBase')} → ${typeLink(base, 'PlayerBase')}</p>
<p>${typeLink(base, 'DayZPlayer')} is the engine-facing contract in 3_Game. ${typeLink(base, 'DayZPlayerImplement')} sits between that and gameplay: animation commands, weapon lifting, fall damage and death handling. ${typeLink(base, 'PlayerBase')} is where most mods land — inventory, stance, modifiers and action registration.</p>
<p>Prefer <code>modded class PlayerBase</code> for gameplay changes. Reach into ${typeLink(base, 'DayZPlayerImplement')} only when the hook you need lives in that simulation layer.</p>

<h2 id="items" class="text-lg mt-16 mb-4 font-semibold">Items and inventory</h2>
<p>${typeLink(base, 'ItemBase')} is the scripted base of inventory items. Config classes with no script of their own typically resolve through ${typeLink(base, 'Inventory_Base')}, an empty ${typeLink(base, 'ItemBase')} under the name plain item configs extend.</p>
<p>Closer bases such as ${typeLink(base, 'Edible_Base')} specialise categories; start from the nearest vanilla sibling of your item rather than re-deriving everything from ${typeLink(base, 'ItemBase')}.</p>
<p>Hierarchy parent (inventory ownership) and scene parent (attachment in the world graph) are different APIs on ${typeLink(base, 'EntityAI')} / ${typeLink(base, 'IEntity')}. Follow <code>OnWasAttached</code>, <code>CanPut*</code> and inventory location helpers from the class page when a move misbehaves.</p>

<h2 id="actions" class="text-lg mt-16 mb-4 font-semibold">Actions</h2>
<p>${typeLink(base, 'ActionBase')} is the root. The usual specialisations are:</p>
<ul>
  <li>${typeLink(base, 'ActionInteractBase')} — press-to-interact world actions (doors, switches); no item required, no progress bar</li>
  <li>${typeLink(base, 'ActionContinuousBase')} — hold-to-perform (bandage, drink); completion logic belongs in <code>OnFinishProgressServer</code></li>
  <li>${typeLink(base, 'ActionSingleUseBase')} — one-shot item actions</li>
</ul>
<p>Registration and condition checks live with the action classes and the player/item methods that expose them. Open a vanilla action close to yours, then walk <strong>Referenced by</strong> to see how it is offered to the player.</p>

<h2 id="mission-ui" class="text-lg mt-16 mb-4 font-semibold">Mission and UI</h2>
<p>${typeLink(base, 'MissionServer')} is the server mission entry point; ${typeLink(base, 'MissionGameplay')} owns client gameplay updates and input. Both hang off the mission base types in ${layerLink(base, '5_Mission')}.</p>
<p>${typeLink(base, 'UIScriptedMenu')} is the usual scripted menu base. ${typeLink(base, 'IngameHud')} is the vanilla HUD. Widget primitives and layout wiring sit under ${topicLink(base, 'WidgetAPI', 'Widget UI')} and ${typeLink(base, 'Widget')} — many of those members are engine declarations, not script bodies.</p>

<h2 id="plugins" class="text-lg mt-16 mb-4 font-semibold">Plugins</h2>
<p>${typeLink(base, 'PluginManager')} creates and owns every ${typeLink(base, 'PluginBase')} singleton on server and client. <code>GetPlugin(typename)</code> is the front door. Use a plugin when the behaviour is a game-wide service rather than something that belongs on one entity instance.</p>

<h2 id="reading" class="text-lg mt-16 mb-4 font-semibold">How to read a stack</h2>
<ol>
  <li>Open the entry-point class from the table and read its inheritance list on the class page.</li>
  <li>Skim the members you care about; note <code>proto</code>, <code>event</code> and script bodies (<a href="${base}guides/engine-and-script/">engine guide</a>).</li>
  <li>Jump to <strong>src</strong> for implementations, then <strong>References</strong> / <strong>Referenced by</strong>.</li>
  <li>Check the file path's layer before choosing <code>modded class</code> (<a href="${base}guides/script-layers/">script layers</a>).</li>
  <li>Compare a vanilla subclass beside yours instead of inventing a new root type.</li>
</ol>
${furtherReading(base)}
</div>`;

  return layout({
    ...ctx,
    title: 'Inheritance and entry points',
    active: 'guides/',
    description: 'Where to open the DayZ script class tree for players, items, actions, missions and plugins.',
    breadcrumbs: [
      { label: 'Guides', href: `${base}guides/` },
      { label: 'Inheritance and entry points' },
    ],
    content,
  });
}
