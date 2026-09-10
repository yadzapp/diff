// The home page at /.

import { layout } from '../html.js';
import { linkCards } from './shared.js';

export function renderHome(ctx) {
  const { site, base } = ctx;
  const s = site.stats;

  const statNew = (n, label) =>
    `<div class="stat-new-item"><p>${n.toLocaleString('pt-BR')}</p><span>${label}</span></div>`;

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

  // The lede is the <h1>, rather than a page with no heading at all. It reads
  // and sets the same as the paragraph it replaces (see .hero h1 in
  // site/styles/content.css); what it adds is that the one line naming what
  // this site is is marked up as the one line naming what this site is.
  const content = /* html */ `
<section class="hero">
  <h1>DIFF stands for DayZ Internal File Finder. <br>
  Browsable documentation for the DayZ scripts, the Enforce Script source of the game.</h1>
</section>
<div class="home-stack">

<section class="stats-new">
  ${statNew(s.files, 'Script files')}
  ${statNew(s.classes, 'Classes')}
  ${statNew(s.methods, 'Methods')}
  ${statNew(s.enums, 'Enums')}
  ${statNew(s.globals, 'Constants')}
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
    description: `Browse the DayZ scripts for build ${site.version}: every Enforce Script class, method, enum and global, plus the full file list of the script source.`,
    content,
  });
}
