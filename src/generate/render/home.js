// The home page at /.

import { layout, esc, H1_HERO, H2 } from '../html.js';
import { linkCards, updateNames, fmtDate } from './shared.js';

export function renderHome(ctx) {
  const { site, base, versions = [] } = ctx;
  const updateName = updateNames(versions).get(site.build);
  const update = updateName?.match(/Update (\d+)$/)?.[1];

  const statNew = (value, label, primary) => {
    const text = typeof value === 'number' ? value.toLocaleString('pt-BR') : esc(String(value));
    const mid = primary != null ? `<span>${esc(String(primary))}</span>` : '';
    return `<div class="stat-new-item flex flex-col"><p class="text-3xl">${text}</p>${mid}<span class="text-fg2">${esc(label)}</span></div>`;
  };

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
  // and sets as a paragraph (H1_HERO: normal weight, fg color); what it adds
  // is that the one line naming what this site is is marked up as the one
  // line naming what this site is.
  const content = /* html */ `
<section class="hero">
  <h1 class="${H1_HERO}">DIFF stands for DayZ Internal File Finder. <br>
  Browsable documentation for the DayZ scripts, the Enforce Script source of the game.</h1>
</section>
<div class="flex flex-col gap-12 mt-12">

<section class="flex gap-12">
  ${statNew(site.version, 'Version')}
  ${statNew(site.build.split('.').pop(), `Build · Update ${update}`)}
  ${site.date ? statNew(fmtDate(site.date, '2-digit'), 'Released on') : ''}
</section>

<section>
  <h2 class="${H2} mt-0 mb-4">Start here</h2>
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
