// One class: /classes/<Name>/, and the flat list of everything it inherits at
// /classes/<Name>/members/.

import {
  esc, layout, linkType, condBadges, modBadges, methodSig, varSig,
  renderDoc, briefOf, slug, linkedH2,
} from '../html.js';
import {
  anchorFor, callersBlock, fileLineHref, fileButtons, referencesBlock,
} from './shared.js';

export function renderClass(ctx, cls) {
  const { site, base } = ctx;
  const used = new Set();

  // Page cue is a single chip when there is a panel to open: parent › current
  // · Hierarchy N. Deeper ancestors and the descendant tree live in the panel.
  // Tombstones are absent from site.classes, so walk from the snapshot's base.
  const ancestors = site.classes.has(cls.name)
    ? site.ancestorsOf(cls.name)
    : cls.baseName
      ? [cls.baseName, ...site.ancestorsOf(cls.baseName)]
      : [];
  const kids = site.children.get(cls.name) || [];
  const typeLink = (n) =>
    site.classes.has(n) ? `<a href="${base}classes/${n}/">${esc(n)}</a>` : esc(n);
  const sep = ' <span class="chain-sep mx-0.5 opacity-50">›</span> ';
  const parent = ancestors[0];
  const descendantNames = new Set();
  const descendantNode = (name, seen) => {
    if (seen.has(name)) return '';
    descendantNames.add(name);
    const nextSeen = new Set(seen).add(name);
    const children = (site.children.get(name) || [])
      .map((child) => descendantNode(child, nextSeen))
      .filter(Boolean)
      .join('');
    return `<li>${typeLink(name)}${children ? `<ul>${children}</ul>` : ''}</li>`;
  };
  const kidTree = kids
    .map((child) => descendantNode(child, new Set([cls.name])))
    .join('');
  // Focused path: ancestors nest down to current, then the real descendant
  // tree branches underneath — never siblings of an ancestor.
  let hierarchyInner = `<li class="desc-current"><strong>${esc(cls.name)}</strong>${kidTree ? `<ul>${kidTree}</ul>` : ''}</li>`;
  for (const name of ancestors) {
    hierarchyInner = `<li>${typeLink(name)}<ul>${hierarchyInner}</ul></li>`;
  }
  // Panel when the short cue is not the whole story: deeper ancestors and/or
  // any descendants.
  const showHierarchy = ancestors.length > 1 || kids.length > 0;
  const hierarchyCount = descendantNames.size
    ? `Hierarchy ${descendantNames.size.toLocaleString('en-US')}`
    : 'Hierarchy';
  const hierarchyLabel = parent
    ? `${parent} › ${cls.name} · ${hierarchyCount}`
    : hierarchyCount;
  const hierarchy = showHierarchy
    ? `<div class="descendants mt-0 mb-3.5"><button type="button" class="chip desc-btn" aria-expanded="false">${esc(hierarchyLabel)}</button><template class="desc-src"><ul class="desc-tree">${hierarchyInner}</ul></template></div>`
    : '';
  // Parent-only (nothing to open): keep a linked chain, not a chip.
  const chain = !showHierarchy && parent
    ? `<p class="chain mt-0 mb-3.5 text-xs text-fg2">${typeLink(parent)}${sep}<strong>${esc(cls.name)}</strong></p>`
    : '';

  // Only worth its own page when there is something above to inherit from;
  // without a base the list would be this page over again. Whether the chain
  // holds a documented class is already part of what this page depends on
  // (see classDeps), so the link cannot go stale. Tombstones skip it: there
  // is no /members/ page for a type the current build no longer declares.
  const allMembers = site.classes.has(cls.name)
    && ancestors.some((n) => site.classes.has(n))
    ? `<p class="all-members mt-3 mb-0 text-sm"><a href="${base}classes/${cls.name}/members/">All members, including inherited</a></p>`
    : '';

  const basesNote =
    cls.bases.length > 1
      ? `<p class="alt-bases text-sm text-fg2">Base class depends on build flags: ${cls.bases
          .map((b) => `${linkType(b.base, site, base)}${condBadges(b.cond, base)}`)
          .join(' · ')}</p>`
      : '';

  const constants = cls.members.filter((m) => m.mods?.includes('const'));
  const vars = cls.members.filter((m) => !m.mods?.includes('const'));
  const ctors = cls.methods.filter((m) => m.kind === 'ctor' || m.kind === 'dtor');
  const methods = cls.methods.filter((m) => !m.kind);

  const memberBlock = (v) => {
    const id = anchorFor(used, v.name);
    const doc = v.doc ? `<div class="member-doc">${renderDoc(v.doc, site, base)}</div>` : '';
    const src = v.file ? ` data-src="${fileLineHref(site, base, v.file, v.line)}"` : '';
    return /* html */ `<div class="member" id="${id}"${src}>
<div class="member-sig"><code>${varSig(v, site, base)}</code>${condBadges(v.cond, base)}</div>
${doc}${callersBlock(v.name, ctx, cls.name, true)}</div>`;
  };

  const methodBlock = (m) => {
    const id = anchorFor(used, m.name);
    const doc = m.doc ? `<div class="member-doc">${renderDoc(m.doc, site, base)}</div>` : '';
    const src = m.file ? ` data-src="${fileLineHref(site, base, m.file, m.line)}"` : '';
    return /* html */ `<div class="member" id="${id}"${src}>
<div class="member-sig"><code>${methodSig(m, site, base)}</code>${condBadges(m.cond, base)}</div>
${doc}${referencesBlock(m, ctx, cls.name)}${callersBlock(m.name, ctx, cls.name)}</div>`;
  };

  const memberSep = '<div class="my-2 border-b border-line/40" aria-hidden="true"></div>';
  const section = (title, items, block) =>
    items.length
      ? `${linkedH2(slug(title), title, { count: items.length })}\n${items.map(block).join(`\n${memberSep}\n`)}`
      : '';

  const files = fileButtons(
    site,
    base,
    cls.locations.filter((l) => !l.forward).concat(cls.locations.filter((l) => l.forward))
  );

  const classTopic = cls.group && site.groups.get(cls.group);
  const module = classTopic
    ? `<p class="in-module text-sm text-fg2">Part of <a href="${base}topics/${classTopic.slug}/">${esc(classTopic.label)}</a></p>`
    : '';

  const badges =
    (cls.modded ? modBadges(['modded']) : '') +
    modBadges(cls.mods) +
    condBadges(cls.cond, base);

  const attrs = cls.attrs.length
    ? `<pre class="attrs"><code>${cls.attrs.map(esc).join('\n')}</code></pre>`
    : '';

  // Absent from this build: last-known body with a Removed chip, no Source /
  // suggest / copy affordances that assume the type still ships.
  const gone = !site.classes.has(cls.name);

  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold class-title"${gone ? ' data-gone' : ''}><span class="kw">class</span> ${esc(cls.name)}${cls.generics ? `<span class="generics ml-0.5 text-xs font-normal text-fg2">${esc(cls.generics)}</span>` : ''}${badges}${gone ? '' : files}</h1>
${chain}
${hierarchy}
${module}
${basesNote}
${allMembers}
${attrs}
${cls.doc ? `<div class="class-doc">${renderDoc(cls.doc, site, base)}</div>` : ''}
${section('Constructors', ctors, methodBlock)}
${section('Constants', constants, memberBlock)}
${section('Members', vars, memberBlock)}
${section('Methods', methods, methodBlock)}`;

  const brief = cls.doc ? briefOf(cls.doc, null, base).replace(/<[^>]+>/g, '') : '';
  return layout({
    ...ctx,
    title: cls.name,
    active: 'classes/',
    description: `${cls.name} class reference — ${brief || `members, methods and Enforce Script source of ${cls.name} in the DayZ scripts.`}`,
    content,
  });
}

/**
 * Every member reachable on a class, its own and its ancestors'.
 *
 * The question this answers — "what can I actually call on this thing" — has
 * no answer anywhere else, on this site or on either of the Doxygen ones.
 * ItemBase is ItemBase › InventoryItem › EntityAI › Entity › ObjectTyped ›
 * Object › IEntity › Managed, and its own page shows one eighth of it.
 *
 * One row per name rather than per declaration, because that is what a call
 * site resolves to: the nearest class in the chain that declares the name
 * wins, and the ones it shadows are named beside it. Overloads collapse into
 * the row of the name they share, counted rather than repeated.
 */
export function renderClassMembers(ctx, cls) {
  const { site, base } = ctx;
  const chain = [cls.name, ...site.ancestorsOf(cls.name)].filter((n) => site.classes.has(n));

  // The rows are built in the browser by site/app/members.js, and the only
  // thing shipped is the chain to build them from.
  //
  // Written into the page instead, they cost 564 MB across one build: a
  // member appears once per class that inherits it, so the total is every
  // member times its descendants, and DayZ's hierarchies are both deep and
  // wide. The same rows composed from search.json — which already lists every
  // class's methods and fields with their owner, and which the page fetches
  // for the command palette regardless — cost nothing at all.
  //
  // What that trades away is the table for a reader without JavaScript. The
  // chain below is the honest fallback: every class in it is a link, and each
  // of those pages is static and lists its own members in full.
  const chainHtml = chain.length > 1
    ? `<p class="chain mt-0 mb-0 text-xs text-fg2">${chain
        .map((n, i) => (i === 0 ? `<strong>${esc(n)}</strong>` : `<a href="${base}classes/${n}/">${esc(n)}</a>`))
        .join(' <span class="chain-sep mx-0.5 opacity-50">›</span> ')}</p>`
    : '';

  const content = /* html */ `
<h1 class="text-lg leading-[var(--text-2xl--line-height)] mt-0 mb-3 text-accent font-semibold">All members of ${esc(cls.name)}</h1>
${chainHtml}
<p>Everything callable on a <code>${esc(cls.name)}</code>, its own and everything it inherits from the ${(chain.length - 1).toLocaleString('en-US')} ${chain.length === 2 ? 'class' : 'classes'} above. Each name links to the class that declares it; where a name is declared more than once in the chain, the nearest one is the one that answers.</p>
<p><a href="${base}classes/${cls.name}/">Back to ${esc(cls.name)}</a></p>
<table class="list all-members-table" id="allMembers" data-chain="${esc(chain.join(','))}">
<thead><tr><th>Member</th><th>Declared by</th><th></th></tr></thead>
<tbody></tbody></table>
<p class="members-fallback text-sm text-fg2">Assembling the list from the class index. If it does not appear, each class in the chain above lists its own members in full.</p>`;

  return layout({
    ...ctx,
    // "Member List" is what Doxygen called this page and what searches for it
    // still carry; the kind suffix is left off because the title says it.
    title: `${cls.name} Member List`,
    active: 'classes/',
    description: `Member list for the DayZ script class ${cls.name}: every member it declares plus everything it inherits from ${chain.slice(1).join(', ')}.`,
    content,
  });
}
