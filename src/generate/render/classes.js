// Everything under /classes/ except the inheritance tree at /classes/ itself
// (render/hierarchy.js) and one class's own page (render/class.js): the
// name-only index, the per-letter pages, and the member indexes.

import { esc, layout, condBadges, briefOf, modBadges, linkedHeading } from '../html.js';
import { letterTitle, pageBar } from './pagebar.js';

/** Class Index: names only, which is what makes it quick to scan. */
export function renderClassesIndex(ctx, letters) {
  const { site, base } = ctx;
  const sections = [...letters.entries()]
    .map(
      ([l, names]) => /* html */ `${linkedHeading(l, letterTitle(l), {
        count: names.length,
        href: `${base}classes/${l}/`,
      })}
<div class="namegrid grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-0.5 mt-2.5 mb-6 text-sm">${names.map((n) => `<a href="${base}classes/${n}/">${esc(n)}</a>`).join('')}</div>`
    )
    .join('\n');
  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Class Index <span class="count text-sm font-normal text-fg2">${site.classes.size.toLocaleString('en-US')}</span></h1>
<p>All class names, alphabetically. Follow a letter for the same list with descriptions.</p>
${sections}`;
  return layout({
    ...ctx,
    title: 'Class Index',
    active: 'classes/index/',
    description: `Data structure index for the DayZ scripts: all ${site.classes.size.toLocaleString('en-US')} Enforce Script class names, alphabetically.`,
    breadcrumbs: [{ label: 'Classes', href: `${base}classes/` }, { label: 'Index' }],
    content,
  });
}

export function renderClassesLetter(ctx, letter, names, letters) {
  const { site, base } = ctx;
  const rows = names
    .map((n) => {
      const c = site.classes.get(n);
      const brief = c.doc ? briefOf(c.doc, site, base) : '';
      const badges = (c.modded ? modBadges(['modded']) : '') + condBadges(c.cond, base);
      return `<tr><td><a href="${base}classes/${n}/">${esc(n)}</a>${badges}</td><td>${brief}</td></tr>`;
    })
    .join('\n');
  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Classes — ${letterTitle(letter)} <span class="count text-sm font-normal text-fg2">${names.length}</span></h1>
<table class="list"><tbody>${rows}</tbody></table>`;
  return layout({
    ...ctx,
    title: `Classes ${letterTitle(letter)}`,
    active: 'classes/',
    description: `${names.length.toLocaleString('en-US')} DayZ Enforce Script classes beginning with ${letterTitle(letter)}, with descriptions and links to each class reference.`,
    breadcrumbs: [
      { label: 'Classes', href: `${base}classes/` },
      { label: letterTitle(letter) },
    ],
    content,
  });
}

/** Members: every member and method of every class, by initial.
 *  Letter pages are a shell; the rows are composed in the browser from
 *  search.json by site/app/members.js, the same way /classes/<Name>/members/ is. */
export function renderFields(ctx, letter, letters, kind) {
  const { base } = ctx;
  const KINDS = {
    all: ['Members', 'classes/members/', 'members and methods'],
    functions: ['Methods', 'classes/methods/', 'class methods'],
    variables: ['Fields', 'classes/fields/', 'class fields'],
  };
  const [title, dir, what] = KINDS[kind];

  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">${title}${letter ? ` — ${letterTitle(letter)}` : ''}</h1>
<dl class="fields my-3 text-sm" id="fieldsList" data-kind="${kind}"${letter ? ` data-letter="${esc(letter)}"` : ''}></dl>
<p class="members-fallback text-sm text-fg2">${letter ? 'Assembling the list from the class index.' : 'Pick a letter.'}</p>`;
  return layout({
    ...ctx,
    title: letter ? `${title} ${letterTitle(letter)}` : title,
    active: dir,
    description: letter
      ? `DayZ Enforce Script ${what} beginning with ${letterTitle(letter)}, each named with the class that declares it.`
      : `Every one of the DayZ scripts' ${what}, indexed by initial and named with the class that declares it.`,
    bar: pageBar({ letters: { base, dir, list: letters, current: letter } }),
    content,
  });
}
