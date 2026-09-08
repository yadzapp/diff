// The home page at /.

import { layout, EXT, SITE_TITLE } from '../html.js';
import { linkCards } from './shared.js';

export function renderHome(ctx) {
  const { site, base } = ctx;
  const s = site.stats;

  const stat = (n, label, href) =>
    `<a class="stat" href="${href}"><strong>${n.toLocaleString('en-US')}</strong><span>${label}</span></a>`;

  const explore = [
    ['PlayerBase', `${base}classes/PlayerBase/`, 'The player entity'],
    ['ItemBase', `${base}classes/ItemBase/`, 'Base of all items'],
    ['EntityAI', `${base}classes/EntityAI/`, 'Base of interactive entities'],
    ['ActionBase', `${base}classes/ActionBase/`, 'Player actions'],
    ['Weapon_Base', `${base}classes/Weapon_Base/`, 'Firearms'],
    ['DayZInfected', `${base}classes/DayZInfected/`, 'The infected'],
    ['CarScript', `${base}classes/CarScript/`, 'Vehicles'],
    ['RecipeBase', `${base}classes/RecipeBase/`, 'Handcrafting recipes'],
    ['PluginBase', `${base}classes/PluginBase/`, 'Game-wide services'],
    ['CGame', `${base}classes/CGame/`, 'The GetGame() facade'],
    ['MissionServer', `${base}classes/MissionServer/`, 'The server mission'],
    ['UIScriptedMenu', `${base}classes/UIScriptedMenu/`, 'Scripted menus'],
  ];

  const content = /* html */ `
<section class="hero">
  <p>DIFF stands for DayZ Internal File Finder. <br>
  Browsable documentation for the scripting source code.</p>
</section>
<div class="home-stack">
<section class="stats">
  ${stat(s.classes, 'classes', base + 'classes/')}
  ${stat(s.methods, 'methods', base + 'classes/methods/')}
  ${stat(s.enums, 'enums', base + 'globals/enums/')}
  ${stat(s.typedefs, 'typedefs', base + 'globals/typedefs/')}
  ${stat(s.globals, 'constants', base + 'globals/constants/')}
  ${stat(s.files, 'script files', base + 'files/')}
</section>
<section>
  <h2>Browse</h2>
  <div class="cards">
    <a class="card" href="${base}classes/">
      <h3>Classes</h3>
      <p>All classes and members</p>
    </a>
    <a class="card" href="${base}files/">
      <h3>Files</h3>
      <p>All script files and folders</p>
    </a>
    <a class="card" href="${base}globals/">
      <h3>Globals</h3>
      <p>Functions, constants, enums, typedefs and macros</p>
    </a>
    <a class="card" href="${base}topics/">
      <h3>Topics</h3>
      <p>Topics including math, physics, entities, UI and constant tables</p>
    </a>
    <a class="card" href="${base}changelog/">
      <h3>Changelog</h3>
      <p>Changes in the script between two builds</p>
    </a>
    <a class="card" href="${base}community/">
      <h3>Community</h3>
      <p>Official references, Discord servers, build tools and others</p>
    </a>
  </div>
</section>
<section>
  <h2>Start here</h2>
  ${linkCards(explore)}
</section>
</div>`;

  return layout({
    ...ctx,
    title: '',
    active: '',
    description: `${SITE_TITLE} — DayZ ${site.version} classes, methods, enums and sources.`,
    content,
  });
}
