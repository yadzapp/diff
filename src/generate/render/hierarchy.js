// The inheritance tree at /classes/.

import { esc, layout } from '../html.js';

export function renderHierarchy(ctx) {
  const { site, base } = ctx;

  // Roots: classes whose base is unknown (engine/external) or absent.
  const roots = [];
  for (const [name, c] of site.classes) {
    if (!c.baseName || !site.classes.has(c.baseName)) roots.push(name);
  }
  roots.sort((a, b) => a.localeCompare(b));

  const kidsOf = (name) => site.children.get(name) || [];
  // Full depth so Cmd+F can reach grandchildren; counts stay direct kids.
  const node = (name, seen) => {
    if (seen.has(name)) return '';
    const next = new Set(seen).add(name);
    const kids = kidsOf(name);
    const n = kids.length;
    const link = `<a href="${base}classes/${name}/">${esc(name)}</a>`;
    const count = n ? `<span class="count text-sm font-normal text-fg2">${n}</span>` : '';
    let childList = '';
    if (n) {
      const list = `<ul class="catalog-kids">${kids.map((k) => node(k, next)).join('')}</ul>`;
      childList = n > 8
        ? `<details class="catalog-more"><summary>${n} classes</summary>${list}</details>`
        : list;
    }
    return `<li><div class="catalog-head">${link}${count}</div>${childList}</li>`;
  };

  const sections = new Map();
  for (const name of roots) {
    const first = name[0]?.toUpperCase();
    const letter = first && /[A-Z]/.test(first) ? first : '#';
    if (!sections.has(letter)) sections.set(letter, []);
    sections.get(letter).push(name);
  }

  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">Classes <span class="count text-sm font-normal text-fg2">${site.classes.size.toLocaleString('en-US')}</span></h1>
<p>The inheritance tree of every class in the DayZ scripts. The roots are the classes whose base is engine-side or absent; each name links to its class reference. For A–Z, see the <a href="${base}classes/index/">class index</a>.</p>
${[...sections]
    .map(([letter, names]) => `<h2 id="hierarchy-${letter === '#' ? 'other' : letter.toLowerCase()}" class="text-lg mt-16 mb-4 font-semibold">${letter} <span class="count text-sm font-normal text-fg2">${names.length.toLocaleString('en-US')}</span></h2>
<ul class="catalog">${names.map((name) => node(name, new Set())).join('')}</ul>`)
    .join('\n')}`;
  return layout({
    ...ctx,
    title: 'Classes',
    active: 'classes/',
    description: `Class hierarchy of the DayZ scripts: the inheritance tree of all ${site.classes.size.toLocaleString('en-US')} Enforce Script classes, from their engine-side roots down.`,
    content,
  });
}
