// The home page at /.

import { layout, esc, H1_HERO } from '../html.js';
import { linkCards, stableUpdateNames, fmtDate } from './shared.js';

export function renderHome(ctx) {
  const { site, base, versions = [] } = ctx;
  const updateName = stableUpdateNames(versions).get(site.build);
  // "Road to Badlands Update 2": the name without the version, shown beside it.
  const update = updateName?.replace(/^\d+\.\d+\s+/, '');
  const experimental = site.channel === 'experimental';

  const statNew = (value, label, primary) => {
    const text = typeof value === 'number' ? value.toLocaleString('de-DE') : esc(String(value));
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
  ${statNew(
    site.build.split('.').pop(),
    experimental ? 'Build · Experimental' : (update ? `Build · ${update}` : 'Build'),
  )}
  ${site.date ? statNew(fmtDate(site.date, '2-digit'), experimental ? 'Experimental since' : 'Released on') : ''}
</section>
${experimental ? `<p class="doc-note m-0"><span class="note-tag note-tag-warn">Experimental</span> Scripts from the DayZ Experimental branch — not yet live on stable.</p>` : ''}

<section>
  <h2 class="text-lg mt-0 mb-4 font-semibold">Start here</h2>
  ${linkCards(explore)}
</section>
</div>`;

  return layout({
    ...ctx,
    title: '',
    active: '',
    description: experimental
      ? `Browse the DayZ Experimental ${site.version} scripts: every Enforce Script class, method, enum and global, ahead of the next stable release.`
      : `Browse the DayZ scripts for build ${site.version}: every Enforce Script class, method, enum and global, plus the full file list of the script source.`,
    content,
  });
}
