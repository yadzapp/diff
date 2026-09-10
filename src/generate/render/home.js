// The home page at /.

import { layout } from '../html.js';
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
    description: `Browse the DayZ scripts for build ${site.version}: every Enforce Script class, method, enum and global, plus the full file list of the script source.`,
    content,
  });
}
