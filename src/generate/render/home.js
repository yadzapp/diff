// The home page at /.

import { layout, EXT, SITE_TITLE } from '../html.js';
import { linkCards } from './shared.js';

export function renderHome(ctx) {
  const { site, base } = ctx;
  const s = site.stats;

  const statNew = (n) =>
    `<p>${n.toLocaleString('en-US')}</p>`;

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

<section class="stats-new">
  ${statNew(s.classes)}
</section>

<section class="stats">
  ${stat(s.classes, 'classes', base + 'classes/')}
  ${stat(s.methods, 'methods', base + 'classes/methods/')}
  ${stat(s.enums, 'enums', base + 'globals/enums/')}
  ${stat(s.typedefs, 'typedefs', base + 'globals/typedefs/')}
  ${stat(s.globals, 'constants', base + 'globals/constants/')}
  ${stat(s.files, 'script files', base + 'files/')}
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
