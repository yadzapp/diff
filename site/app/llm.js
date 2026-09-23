/* Copy the page for an LLM, and open it in one.

   The docs already meet agents at /llms.txt and /api.json, but the more
   common flow is a person pasting into a chat window: "why does my override
   never fire" alongside the class it overrides. Selecting a nine-hundred-
   member page by hand drags in the chrome and drops the community notes, so
   one title button copies the full page as Markdown, and a second opens
   Cursor / Claude / ChatGPT with a short identity+URL prompt (URL length
   caps make stuffing the whole member list into a deeplink useless).

   Assembled from the DOM at click time rather than shipped with the page,
   for the reason everything else here is (the bytes must stay identical
   across builds) and for one more: by click time the client has stamped in
   what the HTML deliberately leaves out — community notes, "added in"
   badges — and reading the page gets all of it for free. */

import { $, fmtDate, pageType, track } from './dom.js';
import { iconButton } from './icon-button.js';
import { copyText } from './copy.js';
import { identity, current } from './builds.js';

const clean = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * An element's text with the page chrome taken out: anchors, copy buttons,
 * the ways to write a note, and the "Community note" tag (the Markdown says
 * it instead). Block elements get a newline so paragraphs stay paragraphs.
 */
function textOf(el) {
  const c = el.cloneNode(true);
  for (const junk of c.querySelectorAll('.anchor, .chip, .title-actions, .note-tag, .note-edit')) junk.remove();
  for (const block of c.querySelectorAll('p, div, li, pre, br')) block.append('\n');
  return c.textContent;
}

/** Doc text as indented continuation lines under a member's bullet. */
const docLines = (el, indent = '  ') =>
  textOf(el).split('\n').map(clean).filter(Boolean).map((l) => indent + l);

/** Status chips riding an element — modded/cond pills, "Added in 1.28". */
const badgesOf = (el) =>
  [...el.querySelectorAll('.badge, .chip-added, .chip-since, .chip-changed, .chip-removed')]
    .map((b) => clean(b.textContent)).filter(Boolean)
    .map((b) => `[${b}]`).join(' ');

/** One member: its signature, whatever badges it wears, its doc, its note.
    The "Referenced by" and "References" lists stay behind: they are leads to
    follow on the page, not knowledge about the member. */
function memberMd(mem) {
  const sig = $('.member-sig code', mem);
  if (!sig) return '';
  const badges = badgesOf($('.member-sig', mem));
  const lines = [`- \`${clean(sig.textContent)}\`${badges ? ` ${badges}` : ''}`];
  const doc = $('.member-doc', mem);
  if (doc) lines.push(...docLines(doc));
  const note = $('.note-community', mem);
  if (note) lines.push(`  Community note: ${clean(textOf(note))}`);
  return lines.join('\n');
}

/** References / Referenced-by lines for a member (all visible link names). */
function xrefLines(mem) {
  return [...mem.querySelectorAll(':scope > .xref')].map((box) => {
    const label = clean($('.xref-label', box)?.textContent || '');
    const names = [...box.querySelectorAll('a')].map((a) => clean(a.textContent)).filter(Boolean);
    const more = clean($('.xref-rest', box)?.textContent || '');
    if (!names.length && !more) return '';
    return `${label}: ${[...names, more].filter(Boolean).join(', ')}`;
  }).filter(Boolean);
}

/**
 * Full plain-text dump of one member: signature, doc, note, xrefs.
 * Used by Copy declaration and the member Copy-for-AI ask prompt.
 */
export function memberPlain(mem) {
  const sig = clean($('.member-sig code', mem)?.textContent || '');
  if (!sig) return '';
  const badges = badgesOf($('.member-sig', mem));
  const parts = [`${sig}${badges ? ` ${badges}` : ''}`];
  const doc = $('.member-doc', mem);
  if (doc) {
    const body = textOf(doc).split('\n').map(clean).filter(Boolean).join('\n');
    if (body) parts.push(body);
  }
  const note = $('.note-community', mem);
  if (note) parts.push(`Community note: ${clean(textOf(note))}`);
  parts.push(...xrefLines(mem));
  return parts.join('\n\n');
}

/** Ask-prompt builder for a .member node (used by signature chips). */
export function memberAskPrompt(mem) {
  const kind = pageType?.kind === 'enum' ? 'enum' : 'class';
  const name = pageType?.name || 'this type';
  const hash = mem.id ? `#${mem.id}` : '';
  const url = `${location.origin}${location.pathname}${hash}`;
  const build = current
    ? `Build: DayZ ${current.name} (${current.build}), released ${fmtDate(current.date)}`
    : '';
  const detail = memberPlain(mem);
  return [
    `I'm working with the DayZ Enforce Script API ${kind} \`${name}\`.`,
    '',
    `Source: ${url}`,
    build,
    `Full index: ${location.origin}/llms.txt`,
    detail ? `\n${detail}` : '',
    '',
    'Please help me understand this API member and answer questions about it.',
  ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

/** One enum value row: name, value, badges, doc, note. */
function rowMd(row) {
  const name = clean(row.cells[0]?.querySelector('code')?.textContent || row.id);
  if (!name) return '';
  const badges = badgesOf(row.cells[0] || row);
  const value = clean(row.cells[1]?.textContent || '');
  const doc = row.cells[2];
  const note = doc && $('.note-community', doc);
  const rest = doc && (() => {
    const c = doc.cloneNode(true);
    for (const n of c.querySelectorAll('.note-community, .note-add')) n.remove();
    return clean(c.textContent);
  })();
  return `- \`${name}\`${value ? ` = ${value}` : ''}${badges ? ` ${badges}` : ''}${rest ? ` — ${rest}` : ''}` +
    (note ? `\n  Community note: ${clean(textOf(note))}` : '');
}

/**
 * The whole page, walked child by child so the Markdown reads in the order
 * the page does. Anything unrecognised is chrome and stays out.
 */
function pageMarkdown(main) {
  const out = [];
  let members = [];
  const flush = () => {
    if (members.length) out.push(members.join('\n'));
    members = [];
  };

  for (const el of main.children) {
    if (el.matches('h1.class-title')) {
      const c = el.cloneNode(true);
      const badges = badgesOf(c);
      const files = [...c.querySelectorAll('.file-btn')]
        .map((a) => `- ${a.dataset.tip || clean(a.textContent)}`)
        .join('\n');
      for (const b of c.querySelectorAll('.badge, .note-ask, .title-actions')) b.remove();
      out.push(`# ${clean(c.textContent)}${badges ? ` ${badges}` : ''}`);
      if (files) out.push(files);
    } else if (el.matches('.chain')) {
      out.push(`Inheritance: ${clean(el.textContent)}`);
    } else if (el.matches('.descendants')) {
      const cue = clean($('.desc-btn', el)?.textContent || '');
      if (cue) out.push(cue);
      const root = $('.desc-src', el)?.content;
      const names = [...(root?.querySelectorAll('a, .desc-current > strong') || [])]
        .map((n) => n.textContent.trim())
        .filter(Boolean);
      if (names.length) out.push(`Hierarchy: ${names.join(' › ')}`);
      const members = clean($('.all-members', el)?.textContent || '');
      if (members) {
        out.push(`${members}: ${location.origin}${location.pathname}members/`);
      }
    } else if (el.matches('.in-module, .alt-bases')) {
      out.push(clean(el.textContent));
    } else if ($('.all-members', el) || el.matches('.all-members')) {
      const members = clean((el.matches('.all-members') ? el : $('.all-members', el)).textContent);
      out.push(`${members}: ${location.origin}${location.pathname}members/`);
    } else if (el.matches('pre.attrs') || $('pre.attrs', el)) {
      const pre = el.matches('pre.attrs') ? el : $('pre.attrs', el);
      out.push('```\n' + pre.textContent.trim() + '\n```');
    } else if (el.matches('.class-doc')) {
      out.push(docLines(el, '').join('\n'));
    } else if (el.matches('.note-community')) {
      out.push(`Community note: ${clean(textOf(el))}`);
    } else if (el.matches('h2') || el.matches('details.member-sec')) {
      flush();
      const h = el.matches('h2') ? el : $('summary > h2', el);
      if (h) {
        const c = h.cloneNode(true);
        const count = clean($('.count', c)?.textContent || '');
        $('.count', c)?.remove();
        out.push(`## ${clean(c.textContent)}${count ? ` (${count})` : ''}`);
      }
      if (el.matches('details.member-sec')) {
        for (const mem of el.querySelectorAll(':scope > .member')) {
          const md = memberMd(mem);
          if (md) members.push(md);
        }
      }
    } else if (el.matches('.member')) {
      const md = memberMd(el);
      if (md) members.push(md);
    } else if (el.matches('.enum-table')) {
      const rows = [...el.querySelectorAll('tbody tr')].map(rowMd).filter(Boolean);
      out.push(`## Values (${rows.length})`, rows.join('\n'));
    }
  }
  flush();

  // What this is and where it came from, said once under the title so the
  // paste stands on its own in a conversation that never saw the site.
  const meta = [
    `Source: ${location.origin}${location.pathname}`,
    current ? `Build: DayZ ${current.name} (${current.build}), released ${fmtDate(current.date)}` : '',
    `DayZ Enforce Script API reference, generated from Bohemia Interactive's official script sources. ` +
      `"Community note" lines are unofficial annotations by modders. Full index: ${location.origin}/llms.txt`,
  ].filter(Boolean).join('\n');
  out.splice(1, 0, meta);

  return out.join('\n\n') + '\n';
}

/**
 * Compact hand-off for Open-in links. Full member dumps blow past every
 * chat URL limit, so these carry identity + the page URL instead — enough
 * for the model to know what is being asked about, and a pointer to fetch
 * or to ask the user to paste from "Copy prompt".
 */
function askPrompt(main) {
  const url = `${location.origin}${location.pathname}`;
  const kind = pageType?.kind === 'enum' ? 'enum' : 'class';
  const name = pageType?.name || 'this type';
  const build = current
    ? `Build: DayZ ${current.name} (${current.build}), released ${fmtDate(current.date)}`
    : '';
  const doc = $('.class-doc', main);
  const blurb = doc
    ? textOf(doc).split('\n').map(clean).filter(Boolean).slice(0, 8).join(' ')
    : '';
  return [
    `I'm working with the DayZ Enforce Script API ${kind} \`${name}\`.`,
    '',
    `Source: ${url}`,
    build,
    `Full index: ${location.origin}/llms.txt`,
    blurb ? `\nSummary:\n${blurb}` : '',
    '',
    'Please help me understand this API and answer questions about it. ' +
      'If you need the full member list, fetch the source URL or ask me to paste it from "Copy page".',
  ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

/* ---- Copy page + Copy for AI ---------------------------------------------
   Two title actions: a plain copy dumps the full page Markdown, and a separate
   button opens Cursor / Claude / ChatGPT with a short askPrompt (full dumps
   do not fit those URL limits). The same Open-in menu rides member signatures
   via makeLlmOpen (shared hover/target chips in copy.js).

   Link shapes (official where documented):
   - Cursor:  cursor://anysphere.cursor-deeplink/prompt?text=…
   - Claude:  claude://claude.ai/new?q=…   (Desktop app)
   - ChatGPT: https://chatgpt.com/?q=… */

const cursorUrl = (text) => `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(text)}`;
const claudeUrl = (text) => `claude://claude.ai/new?q=${encodeURIComponent(text)}`;
const chatGptUrl = (text) => `https://chatgpt.com/?q=${encodeURIComponent(text)}`;

const LOGO = {
  cursor: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 466.73 532.09" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/></svg>`,
  claude: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 256 257" xmlns="http://www.w3.org/2000/svg"><path fill="#D97757" d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"/></svg>`,
  chatgpt: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 256 260" xmlns="http://www.w3.org/2000/svg"><path fill="#0FA47F" d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></svg>`,
};

const itemClass =
  'llm-item flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-fg font-normal no-underline cursor-pointer outline-none hover:bg-bg3 hover:no-underline focus-visible:bg-bg3';

/** One row: icon tile, title, optional external arrow. */
function menuRow({ iconHtml, title, href, ext }) {
  const el = document.createElement(href ? 'a' : 'button');
  if (!href) el.type = 'button';
  el.className = itemClass;
  el.setAttribute('role', 'menuitem');
  if (href) {
    el.href = href;
    el.target = '_blank';
    el.rel = 'noopener';
  }
  el.innerHTML =
    `<span class="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg2 text-fg">${iconHtml}</span>` +
    `<span class="min-w-0 flex-1 text-sm font-medium leading-tight text-left">${title}</span>` +
    (ext ? `<i class="ic ic-ext shrink-0 text-fg3" aria-hidden="true"></i>` : '');
  return el;
}

/**
 * Close every Copy-for-AI menu, optionally skipping one wrap (the one about
 * to open). Shared chips call this when they move so an open menu does not
 * ride along onto the next member.
 */
export function closeLlmMenus(except) {
  for (const open of document.querySelectorAll('.llm-open')) {
    if (except && open === except) continue;
    const m = open.querySelector('.llm-menu');
    const b = open.querySelector('[aria-haspopup="menu"]');
    if (m && !m.hidden) {
      m.hidden = true;
      b?.setAttribute('aria-expanded', 'false');
    }
  }
}

/**
 * Copy-for-AI control: icon button + Cursor/Claude/ChatGPT menu.
 * `getAsk` returns the prompt string (page or member) right before open.
 *
 * @param {{ style?: string, getAsk: () => string | Promise<string> }} opts
 */
export function makeLlmOpen({ style = 'gray', getAsk }) {
  const wrap = document.createElement('span');
  wrap.className = 'llm-open relative inline-flex';

  const btn = iconButton({
    size: 'sm',
    style,
    icon: 'llm',
    label: 'Copy for AI',
    tip: 'Copy for AI',
  });
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');

  const menu = document.createElement('div');
  menu.className = 'llm-menu absolute top-[calc(100%+6px)] right-0 z-[60] flex w-56 max-w-[calc(100vw-1rem)] flex-col p-1.5 bg-bg border border-line rounded-xl shadow-[var(--shadow)] text-left font-normal';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');

  const cursorItem = menuRow({
    iconHtml: LOGO.cursor,
    title: 'Open in Cursor',
    href: 'cursor://anysphere.cursor-deeplink/prompt',
    ext: true,
  });
  const claudeItem = menuRow({
    iconHtml: LOGO.claude,
    title: 'Open in Claude',
    href: 'claude://claude.ai/new',
    ext: true,
  });
  const chatItem = menuRow({
    iconHtml: LOGO.chatgpt,
    title: 'Open in ChatGPT',
    href: 'https://chatgpt.com/',
    ext: true,
  });
  menu.append(cursorItem, claudeItem, chatItem);
  wrap.append(btn, menu);

  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function closeOthers() {
    closeLlmMenus(wrap);
  }

  async function prepare() {
    await identity().catch(() => {});
    const ask = await getAsk();
    cursorItem.href = cursorUrl(ask);
    claudeItem.href = claudeUrl(ask);
    chatItem.href = chatGptUrl(ask);
  }

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!menu.hidden) return close();
    closeOthers();
    await prepare();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  });

  const openIn = (item, kind) => {
    item.addEventListener('click', () => {
      track('copy', { copy_type: kind });
      close();
    });
  };
  openIn(cursorItem, 'llm-cursor');
  openIn(claudeItem, 'llm-claude');
  openIn(chatItem, 'llm-chatgpt');

  wrap.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') {
      close();
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !wrap.contains(e.target)) close();
  });

  return wrap;
}

/** Copy page + Copy for AI menu, beside the title of every class and enum page. */
export function initLlmCopy() {
  if (!pageType) return;
  const main = $('.main');
  const title = main && $('h1.class-title', main);
  if (!title || title.hasAttribute('data-gone')) return;

  const copyBtn = iconButton({
    size: 'sm',
    style: 'gray',
    icon: 'copy',
    className: 'copy-btn copy-llm',
    label: 'Copy page',
    tip: 'Copy page',
  });
  copyBtn.addEventListener('click', async () => {
    await identity().catch(() => {});
    copyText(pageMarkdown(main), copyBtn, 'llm');
  });

  const wrap = makeLlmOpen({
    style: 'gray',
    getAsk: () => askPrompt(main),
  });

  const actions = $('.title-actions', title);
  const note = actions && $('.note-ask', actions);
  const host = actions || title;
  if (note) {
    host.insertBefore(copyBtn, note);
    host.insertBefore(wrap, note);
  } else {
    host.append(copyBtn, wrap);
  }
}
