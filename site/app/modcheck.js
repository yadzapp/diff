/* Compare a local mod with the experimental script snapshot.
   The folder is read in the browser and dropped. Nothing is stored or sent. */

const SKIP_RET = new Set([
  'private', 'protected', 'static', 'proto', 'native', 'owned', 'external',
  'volatile', 'event', 'sealed', 'reference', 'const', 'modded', 'override',
]);
const CALL_MODS = new Set(['out', 'inout', 'notnull']);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Whitespace does not change an Enforce signature. */
export function normSig(s) {
  return String(s).replace(/\s+/g, '');
}

/** Same string the mod scanner builds, from a method the real parser produced. */
export function sigFromMethod(m) {
  const params = (m.params || []).map((p) => {
    const mods = (p.mods || []).filter((x) => CALL_MODS.has(x));
    const arr = p.array !== undefined ? `[${p.array}]` : '';
    return `${mods.length ? `${mods.join(' ')} ` : ''}${p.type || ''}${arr}`;
  });
  return `${m.ret || 'void'}(${params.join(', ')})`;
}

function strip(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      out += '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function isWord(s, i, w) {
  if (!s.startsWith(w, i)) return false;
  const before = s[i - 1];
  const after = s[i + w.length];
  if (before && /[A-Za-z0-9_]/.test(before)) return false;
  if (after && /[A-Za-z0-9_]/.test(after)) return false;
  return true;
}

function classBody(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return '';
}

function matchParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitArgs(s) {
  const args = [];
  let cur = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '<' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      args.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur);
  return args;
}

function paramType(raw) {
  let s = raw.trim();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '<' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === ')' || ch === ']') depth--;
    else if (ch === '=' && depth === 0) {
      s = s.slice(0, i).trim();
      break;
    }
  }
  const words = s.split(/\s+/).filter(Boolean);
  const mods = [];
  while (words.length && CALL_MODS.has(words[0])) mods.push(words.shift());
  let arr = '';
  if (words.length >= 2) {
    const last = words[words.length - 1];
    const named = last.match(/^([A-Za-z_]\w*)((?:\[[^\]]*\])+)$/);
    if (named) {
      words.pop();
      arr = named[2];
    } else if (!/[<[]/.test(last)) words.pop();
  }
  const type = words.join(' ');
  if (!type && !arr && !mods.length) return '';
  return `${mods.length ? `${mods.join(' ')} ` : ''}${type}${arr}`;
}

function overridesIn(inner) {
  const out = [];
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0 || !isWord(inner, i, 'override')) continue;
    const paren = inner.indexOf('(', i);
    const semi = inner.indexOf(';', i);
    const brace = inner.indexOf('{', i);
    const stop = [semi, brace].filter((n) => n >= 0).sort((a, b) => a - b)[0] ?? -1;
    if (paren < 0 || (stop !== -1 && stop < paren)) continue;
    const head = inner.slice(i + 'override'.length, paren).trim();
    const nameM = head.match(/([A-Za-z_]\w*)\s*$/);
    if (!nameM) continue;
    const retWords = head.slice(0, nameM.index).trim().split(/\s+/).filter(Boolean);
    while (retWords.length && SKIP_RET.has(retWords[0])) retWords.shift();
    const close = matchParen(inner, paren);
    if (close < 0) continue;
    const params = splitArgs(inner.slice(paren + 1, close)).map(paramType).filter(Boolean).join(', ');
    out.push({ name: nameM[1], sig: `${retWords.join(' ') || 'void'}(${params})` });
    i = close;
  }
  return out;
}

function baseOf(tail) {
  // First id after extends/colon — not the last (generics: Template<Object> ≠ Object).
  const m = tail.match(/(?:extends|:)\s*([A-Za-z_]\w*)/);
  return m ? m[1] : '';
}

/** modded classes, and any class that overrides something. */
export function scanSource(text) {
  const src = strip(text);
  const out = [];
  const re = /\b(modded\s+)?class\s+([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(src))) {
    let end = m.index + m[0].length;
    while (end < src.length && src[end] !== '{' && src[end] !== ';') end++;
    const base = baseOf(src.slice(m.index + m[0].length, end));
    if (src[end] !== '{') continue;
    const overrides = overridesIn(classBody(src, end));
    if (m[1] || overrides.length) out.push({ name: m[2], modded: Boolean(m[1]), base, overrides });
  }
  return out;
}

const LAYER = { '1_core': '1_Core', '2_gamelib': '2_GameLib', '3_game': '3_Game', '4_world': '4_World', '5_mission': '5_Mission' };

export function moduleOf(path) {
  const m = String(path).replace(/\\/g, '/').match(/(?:^|\/)([1-5]_[A-Za-z]+)\//);
  return m ? m[1].toLowerCase() : '';
}

function layerName(id) {
  return LAYER[id] || id;
}

function sigsMatch(modSig, expSig) {
  const want = normSig(modSig);
  return String(expSig).split('|').some((s) => normSig(s) === want);
}

function sigRet(sig) {
  return normSig(String(sig).split('|')[0]).split('(')[0];
}

/** True when mod and vanilla share a return type (same overload family). */
function sameRetFamily(modSig, expSig) {
  const want = sigRet(modSig);
  return String(expSig).split('|').some((s) => sigRet(s) === want);
}

function vanillaStart(name, classes, index) {
  const seen = new Set();
  let cur = name;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (index.c?.[cur]) return cur;
    cur = classes.get(cur)?.base || '';
  }
  return '';
}

function findMethod(index, className, method) {
  const seen = new Set();
  let cur = className;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const c = index.c[cur];
    if (!c) return null;
    if (c.m?.[method]) return { sig: c.m[method], owner: cur };
    cur = c.b || '';
  }
  return null;
}

const RANK = { 'missing-class': 0, 'missing-method': 1, sig: 2, module: 3, ok: 4 };

/**
 * files: { path, text }[] of Enforce sources. index.c is the compared build.
 * prior.c is an older DayZ build used only for Class/Method gone: those fire
 * when prior still has the symbol and this build does not. Pass null when
 * comparing an older build (nothing can be "gone" relative to a newer one),
 * or CF / VPP noise returns.
 */
export function analyze(files, index, prior = null) {
  const classes = new Map();
  for (const file of files) {
    for (const c of scanSource(file.text)) {
      let e = classes.get(c.name);
      if (!e) classes.set(c.name, (e = { name: c.name, modded: false, own: false, base: '', file: file.path, overrides: [] }));
      e.modded = e.modded || c.modded;
      e.own = e.own || !c.modded;
      if (c.base) e.base = c.base;
      for (const o of c.overrides) e.overrides.push({ ...o, file: file.path });
    }
  }

  const rows = [];
  for (const c of classes.values()) {
    if (c.modded && !index.c?.[c.name]) {
      // Declared in this drop as `class X`, or never present in the older build.
      if (c.own) continue;
      if (!prior?.c?.[c.name]) continue;
      rows.push({ status: 'missing-class', cls: c.name, file: c.file });
      continue;
    }
    const start = vanillaStart(c.name, classes, index);
    if (!start) continue;
    const inVanilla = Boolean(index.c?.[c.name]);
    // Wrong folder only when this class itself is vanilla. A new mod class that
    // extends a DayZ type can live in any script module.
    const vanillaMod = inVanilla ? (index.c[c.name].d || '') : '';
    for (const o of c.overrides) {
      const hit = findMethod(index, start, o.name);
      const fileMod = moduleOf(o.file);
      const folder = vanillaMod && fileMod && vanillaMod !== fileMod
        ? { from: layerName(fileMod), to: layerName(vanillaMod) }
        : null;
      if (!hit) {
        // New mod classes often override methods from other mods (CF, …).
        if (!inVanilla) continue;
        // Mod-only API on a vanilla class (VPPAT_*, CF_*, …). Only "method gone"
        // when the older DayZ build still has it — then it was really removed.
        if (!prior?.c || !findMethod(prior, start, o.name)) continue;
        rows.push({ status: 'missing-method', cls: c.name, method: o.name, file: o.file, folder });
        continue;
      }
      const same = sigsMatch(o.sig, hit.sig);
      // #ifdef forks leave both signatures in the source; if any matches, skip the rest.
      if (!same && c.overrides.some((x) => x.name === o.name && sigsMatch(x.sig, hit.sig))) continue;
      // New class overriding a mod parent: same name as a vanilla method but a
      // different overload (CustomSubMenu.OnUpdate(float) vs SWEH.OnUpdate(Widget)).
      if (!same && !inVanilla && !sameRetFamily(o.sig, hit.sig)) continue;
      rows.push({
        status: !same ? 'sig' : folder ? 'module' : 'ok',
        cls: c.name,
        method: o.name,
        file: o.file,
        modSig: o.sig,
        expSig: hit.sig,
        owner: hit.owner === start ? '' : hit.owner,
        folder,
      });
    }
  }
  rows.sort((a, b) => RANK[a.status] - RANK[b.status] || a.cls.localeCompare(b.cls) || (a.method || '').localeCompare(b.method || ''));
  return rows;
}

const cppStr = (text, k) => text.match(new RegExp(`\\b${k}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] || '';

export function readModCpp(text) {
  return {
    name: cppStr(text, 'name'),
    author: cppStr(text, 'author'),
    authorID: cppStr(text, 'authorID'),
    version: cppStr(text, 'version'),
    overview: cppStr(text, 'overview'),
    tooltip: cppStr(text, 'tooltip'),
    action: cppStr(text, 'action'),
    actionName: cppStr(text, 'actionName'),
  };
}

/** Credits and inputs live in CfgMods inside config.cpp more often than in mod.cpp. */
export function readCfgMods(text) {
  return {
    name: cppStr(text, 'name'),
    author: cppStr(text, 'author'),
    authorID: cppStr(text, 'authorID'),
    version: cppStr(text, 'version'),
    overview: cppStr(text, 'overview'),
    action: cppStr(text, 'action'),
    credits: cppStr(text, 'credits'),
    inputs: cppStr(text, 'inputs'),
  };
}

function readMetaCpp(text) {
  return {
    name: text.match(/\bname\s*=\s*"([^"]*)"/i)?.[1] || '',
    workshop: text.match(/\bpublishedid\s*=\s*(\d+)/i)?.[1] || '',
  };
}

/** Workshop file id from a Steam sharedfiles URL in action. */
export function workshopFromUrl(url) {
  return String(url).match(/steamcommunity\.com\/sharedfiles\/filedetails\/\?[^#]*\bid=(\d+)/i)?.[1] || '';
}

function csvFields(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** DayZ stringtable.csv → Map of lowercased key → english (or original) text. */
export function readStringtable(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return new Map();
  const header = csvFields(lines[0]).map((h) => h.trim().toLowerCase());
  const eng = header.indexOf('english');
  const orig = header.indexOf('original');
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = csvFields(lines[i]);
    const key = (cols[0] || '').trim();
    if (!key || /^language$/i.test(key)) continue;
    const at = (n) => (n > 0 ? (cols[n] || '').trim() : '');
    const val = at(eng) || at(orig) || cols.slice(1).map((c) => c.trim()).find(Boolean) || '';
    if (val) map.set(key.toLowerCase(), val);
  }
  return map;
}

/** Resolve #STR_FOO / $STR_FOO against a stringtable map; leave plain text alone. */
export function resolveStr(raw, table) {
  const s = String(raw || '');
  if (!table?.size) return s;
  const key = s.match(/^[#$]?(STR_.+)$/i)?.[1] || s.match(/^[#$]([A-Za-z_]\w*)$/)?.[1];
  if (!key) return s;
  return table.get(key.toLowerCase()) || s;
}

/** Real mods rarely set actionName — label the link from the host. */
export function actionLinkLabel(url, actionName) {
  if (actionName) return actionName;
  const u = String(url).toLowerCase();
  if (/discord\.(gg|com)|discordapp\.com/.test(u)) return 'Discord';
  if (/github\.com/.test(u)) return 'GitHub';
  if (/steamcommunity\.com/.test(u)) return 'Workshop';
  return 'Website';
}

function modCardHtml(card, warnings) {
  const name = card.name || card.prefixes[0] || card.folder || 'Unnamed mod';
  const rows = [];
  const row = (label, html) => {
    if (!html) return;
    rows.push(`<dt class="text-fg3">${esc(label)}</dt><dd class="m-0 min-w-0">${html}</dd>`);
  };
  const link = (href, label) =>
    `<a class="group inline-flex items-center gap-1.5 hover:no-underline" href="${esc(href)}" target="_blank" rel="noopener"><span class="group-hover:underline">${esc(label)}</span><i class="ic ic-ext size-3.5" aria-hidden="true"></i></a>`;
  const workshopUrl = card.workshop
    ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${card.workshop}`
    : '';
  row('Name', `<span class="font-semibold">${esc(name)}</span>`);
  if (card.tooltip && card.tooltip !== name) row('Tooltip', esc(card.tooltip));
  row('Author', card.author && esc(card.author));
  if (card.credits && card.credits !== card.author) row('Credits', esc(card.credits));
  if (/^\d{17}$/.test(card.authorID)) {
    row('Steam', link(`https://steamcommunity.com/profiles/${card.authorID}`, card.authorID));
  }
  row('Version', card.version && esc(card.version));
  row('Description', card.overview && esc(card.overview));
  if (card.prefixes.length) row('Prefix', esc(card.prefixes.join(', ')));
  if (card.inputs) row('Inputs', esc(card.inputs.replace(/\\/g, '/')));
  if (workshopUrl) row('Workshop', link(workshopUrl, card.workshop));
  if (/^https?:\/\//i.test(card.action)) {
    const sameWorkshop = workshopUrl && card.action.replace(/\/$/, '') === workshopUrl;
    if (!sameWorkshop) {
      const label = actionLinkLabel(card.action, card.actionName);
      row(label, link(card.action, card.action.replace(/^https?:\/\//, '').replace(/\/$/, '')));
    }
  }
  const warn = warnings.length
    ? `<ul class="list-none col-span-2 m-0 mt-1 p-0 flex flex-col gap-1 text-sm text-fg2">${warnings.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '';
  return `<div class="card block p-4 border border-line rounded-2xl transition-colors duration-150">
  <div class="flex items-start justify-between gap-3" data-mod-body>
    <div class="min-w-0 flex-1">
      <dl class="m-0 grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">${rows.join('')}${warn}</dl>
    </div>
    <button type="button" class="btn inline-flex shrink-0 items-center gap-1.5" data-mod-pick><i class="ic ic-upload" aria-hidden="true"></i>Check new mod</button>
  </div>
</div>`;
}

/** Top folder of a drop, when mod.cpp did not name the mod. */
function dropFolderName(picked) {
  const roots = new Set();
  for (const { file, path } of picked) {
    const root = String(path || file.name).replace(/\\/g, '/').split('/').filter(Boolean)[0];
    if (root && root.toLowerCase() !== 'scripts') roots.add(root);
  }
  return roots.size === 1 ? [...roots][0] : '';
}

const VERS = 0x56657273;

function readCString(bytes, o) {
  let i = o;
  while (i < bytes.length && bytes[i] !== 0) i++;
  return [new TextDecoder().decode(bytes.subarray(o, i)), i + 1];
}

/** Header properties, plus uncompressed .c/.cpp. Compressed entries are counted and skipped.
    ponytail: no LZO unpack; point at the project tree when the addon is packed. */
export function readPbo(buffer) {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let o = 0;
    const u32 = () => {
      if (o + 4 > bytes.length) throw new Error('short');
      const n = view.getUint32(o, true);
      o += 4;
      return n;
    };
    const props = {};
    const entries = [];
    while (o < bytes.length) {
      const [name, next] = readCString(bytes, o);
      o = next;
      const mime = u32();
      u32();
      u32();
      u32();
      const size = u32();
      if (name === '' && mime === VERS) {
        while (o < bytes.length) {
          const [key, k2] = readCString(bytes, o);
          o = k2;
          if (!key) break;
          const [val, v2] = readCString(bytes, o);
          o = v2;
          props[key.toLowerCase()] = val;
        }
        continue;
      }
      if (name === '' && mime === 0) break;
      entries.push({ name, mime, size });
    }
    const files = [];
    let compressed = 0;
    for (const e of entries) {
      if (o + e.size > bytes.length) break;
      const slice = bytes.subarray(o, o + e.size);
      o += e.size;
      const lower = e.name.toLowerCase();
      const script = lower.endsWith('.c') || lower.endsWith('.cpp');
      if (e.mime !== 0) {
        if (script) compressed++;
        continue;
      }
      if (!script) continue;
      if (slice.length >= 4 && slice[0] === 0 && slice[1] === 0x72 && slice[2] === 0x61 && slice[3] === 0x50) continue;
      files.push({ path: e.name.replace(/\\/g, '/'), text: new TextDecoder().decode(slice) });
    }
    return { props, files, compressed };
  } catch {
    return null;
  }
}

const LABEL = {
  'missing-class': ['note-tag note-tag-removed mr-0', 'Class gone'],
  'missing-method': ['note-tag note-tag-removed mr-0', 'Method gone'],
  sig: ['note-tag note-tag-warn mr-0', 'Params changed'],
  module: ['note-tag note-tag-warn mr-0', 'Wrong folder'],
  ok: ['note-tag note-tag-note mr-0', 'Unchanged'],
};

function sigParts(sig) {
  const s = String(sig).trim();
  const open = s.indexOf('(');
  const close = s.lastIndexOf(')');
  if (open < 0 || close < open) return { ret: s, params: [] };
  const inner = s.slice(open + 1, close).trim();
  return { ret: s.slice(0, open).trim() || 'void', params: inner ? inner.split(/\s*,\s*/) : [] };
}

function closestSig(modSig, expSig) {
  const parts = String(expSig).split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return parts[0] || String(expSig);
  const words = (s) => new Set(String(s).split(/\W+/).filter(Boolean));
  const want = words(modSig);
  const score = (s) => [...words(s)].filter((w) => want.has(w)).length;
  return parts.reduce((best, s) => (score(s) > score(best) ? s : best));
}

function wordHtml(text, other, tone) {
  const words = text ? String(text).split(/\s+/) : [];
  const keep = new Set(String(other || '').split(/\s+/).filter(Boolean));
  if (!words.length) return other ? `<span class="rounded-sm bg-warn-bg px-1 ${tone}">—</span>` : '';
  return words.map((w) => (keep.has(w) ? esc(w) : `<span class="rounded-sm bg-warn-bg px-1 ${tone}">${esc(w)}</span>`)).join(' ');
}

/** Two signature rows in one grid, so arguments line up. Only the words that differ are marked. */
function sigDiffHtml(modSig, expSig) {
  const yours = sigParts(modSig);
  const exp = sigParts(closestSig(modSig, expSig));
  const n = Math.max(yours.params.length, exp.params.length);
  const cols = ['max-content', 'max-content', 'max-content'];
  for (let i = 0; i < n; i++) {
    cols.push('max-content');
    if (i < n - 1) cols.push('max-content');
  }
  cols.push('max-content');
  const row = (mark, parts, other, tone) => {
    const bits = [
      `<span class="pr-2 text-fg3">${mark}</span>`,
      `<span>${wordHtml(parts.ret, other.ret, tone)}</span>`,
      `<span class="text-fg3">(</span>`,
    ];
    for (let i = 0; i < n; i++) {
      bits.push(`<span>${wordHtml(parts.params[i] || '', other.params[i] || '', tone)}</span>`);
      if (i < n - 1) bits.push('<span class="text-fg3">,&nbsp;</span>');
    }
    bits.push('<span class="text-fg3">)</span>');
    return bits.join('');
  };
  return `<span class="grid w-max max-w-full items-baseline gap-y-1 overflow-x-auto font-mono text-sm" style="grid-template-columns:${cols.join(' ')}">${row('', yours, exp, 'text-removed')}${row('→', exp, yours, 'text-added')}</span>`;
}

function markedPath(path, folder, tone) {
  const m = String(path).match(new RegExp(`(^|/)(${folder})(?=/|$)`, 'i'));
  if (!m || m.index == null) return esc(path);
  const start = m.index + m[1].length;
  return `${esc(path.slice(0, start))}<span class="rounded-sm bg-warn-bg px-1 ${tone}">${esc(m[2])}</span>${esc(path.slice(start + m[2].length))}`;
}

function folderHtml(file, { from, to }) {
  const yours = String(file).replace(/\\/g, '/');
  const exp = yours.replace(new RegExp(`(^|/)${from}(?=/|$)`, 'i'), `$1${to}`);
  const cell = (path, folder, tone) => `<span class="min-w-0 break-all">${markedPath(path, folder, tone)}</span>`;
  return `<span class="grid w-full min-w-0 items-baseline gap-y-1 font-mono text-sm" style="grid-template-columns:max-content minmax(0,1fr)"><span class="pr-2 text-fg3"></span>${cell(yours, from, 'text-removed')}<span class="pr-2 text-fg3">→</span>${cell(exp, to, 'text-added')}</span>`;
}

function rowHtml(row) {
  const [cls, label] = LABEL[row.status];
  const name = row.method ? `${row.cls}.${row.method}` : row.cls;
  const file = String(row.file).replace(/\\/g, '/');
  let detail = '';
  if (row.status === 'sig') detail = sigDiffHtml(row.modSig, row.expSig);
  else if (row.owner && !row.folder) detail = `<span class="text-fg2">defined on ${esc(row.owner)}</span>`;
  if (row.folder) detail += folderHtml(file, row.folder);
  return `<li class="flex min-w-0 flex-col gap-3 border-b border-line/40 py-4 text-sm last:border-b-0">
  <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <span class="${cls}">${label}</span>
    <a href="/classes/${encodeURIComponent(row.cls)}/"><code>${esc(name)}</code></a>
  </span>
  ${detail}
  ${row.folder ? '' : `<span class="min-w-0 break-all text-fg3 text-xs">${esc(file)}</span>`}
</li>`;
}

function statusHtml({ kind, count = 0 }) {
  const icons = {
    clear: `<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-bg text-added" aria-hidden="true"><i class="ic ic-check size-4"></i></span>`,
    issues: `<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-warn-bg text-edited" aria-hidden="true"><i class="ic ic-alert size-4"></i></span>`,
    empty: `<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-warn-bg text-edited" aria-hidden="true"><i class="ic ic-alert size-4"></i></span>`,
  };
  const titles = {
    clear: 'Mod is compatible',
    issues: `Needs attention in ${count} item${count === 1 ? '' : 's'}`,
    empty: 'No scripts to check',
  };
  const tones = { clear: 'text-accent', issues: 'text-edited', empty: 'text-edited' };
  const detail = kind === 'empty'
    ? `<p class="m-0 mt-1 text-sm font-normal text-fg2">No modded class or override turned up. Packed scripts inside a compressed PBO are not unpacked — choose the project folder.</p>`
    : '';
  return `<div data-mod-status class="mb-4 flex items-center justify-between gap-3 border-b border-line/40 pb-4">
  <span class="flex min-w-0 items-center gap-2.5">
    ${icons[kind]}
    <span class="min-w-0">
      <p class="m-0 text-lg font-semibold ${tones[kind]}">${titles[kind]}</p>
      ${detail}
    </span>
  </span>
</div>`;
}

function listHtml(rows) {
  const shown = rows.filter((r) => r.status !== 'ok');
  if (!shown.length) return '';
  return `<ul class="list-none m-0 p-0">${shown.map(rowHtml).join('')}</ul>`;
}

function readDir(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries((batch) => {
      if (!batch.length) resolve(all);
      else {
        all.push(...batch);
        next();
      }
    }, reject);
  });
}

async function filesFromHandle(handle, prefix, out) {
  if (handle.kind === 'file') {
    const file = await handle.getFile();
    out.push({ file, path: prefix + handle.name });
    return;
  }
  if (handle.kind !== 'directory') return;
  for await (const child of handle.values()) await filesFromHandle(child, `${prefix}${handle.name}/`, out);
}

/** A dropped folder, or loose files, as { file, path }. Paths stay in memory.
    Both entry calls have to happen before the first await, or the drop data is gone. */
async function filesFromDrop(dt) {
  const items = [...dt.items || []].filter((item) => item.kind === 'file');
  const handlePromises = [];
  const entries = [];
  for (const item of items) {
    if (typeof item.getAsFileSystemHandle === 'function') handlePromises.push(item.getAsFileSystemHandle());
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  const out = [];
  for (const handle of await Promise.all(handlePromises)) {
    if (handle) await filesFromHandle(handle, '', out);
  }
  if (!out.length) {
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        out.push({ file, path: prefix + file.name });
        return;
      }
      if (!entry.isDirectory) return;
      for (const child of await readDir(entry.createReader())) await walk(child, `${prefix}${entry.name}/`);
    };
    for (const entry of entries) await walk(entry, '');
  }
  if (out.length) return out;
  return [...dt.files].map((file) => ({ file, path: file.name }));
}

export function initModCheck() {
  const input = document.getElementById('modFolder');
  const results = document.getElementById('modResults');
  if (!input || !results) return;
  const drop = document.querySelector('.shell');
  const hint = document.querySelector('[data-mod-hint]');
  const selectBtn = document.querySelector('[data-mod-select]');
  const list = document.getElementById('modList');
  let against = 'experimental';
  let rows = [];
  if (drop) drop.dataset.modDrop = '1';
  selectBtn?.addEventListener('click', () => input.click());

  const paint = () => {
    const issues = rows.filter((r) => r.status !== 'ok');
    const kind = !rows.length ? 'empty' : issues.length ? 'issues' : 'clear';
    const card = results.querySelector('.card');
    const pick = card?.querySelector('[data-mod-pick]');
    const body = card?.querySelector('[data-mod-body]');
    card?.querySelector('[data-mod-status]')?.remove();
    if (card) {
      card.insertAdjacentHTML('afterbegin', statusHtml({ kind, count: issues.length }));
      if (pick) card.querySelector('[data-mod-status]')?.appendChild(pick);
    } else if (pick && body && pick.parentElement !== body) {
      body.appendChild(pick);
    }
    if (list) list.innerHTML = kind === 'issues' ? listHtml(rows) : '';
  };

  let cache = null;
  const loadIndex = (which) => fetch(which === 'launched' ? '/assets/launched.json' : '/assets/experimental.json')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const indexes = { experimental: loadIndex('experimental'), launched: loadIndex('launched') };
  const targetSel = document.getElementById('modTarget');
  const targetFace = targetSel?.closest('.select-face');
  const faceOf = (index, fallback) => index?.name || (index?.version && String(index.version)) || fallback;
  Promise.all([indexes.experimental, indexes.launched]).then(([exp, launched]) => {
    const names = { experimental: faceOf(exp, 'Experimental'), launched: faceOf(launched, 'Latest') };
    for (const opt of targetSel?.options || []) if (names[opt.value]) opt.textContent = names[opt.value];
    if (targetFace && targetSel) targetFace.dataset.face = targetSel.selectedOptions[0]?.textContent || names.experimental;
  });
  targetSel?.addEventListener('change', () => {
    against = targetSel.value === 'launched' ? 'launched' : 'experimental';
    if (targetFace) targetFace.dataset.face = targetSel.selectedOptions[0]?.textContent || 'Experimental';
    if (cache) readPicked(null, true);
  });

  const readPicked = async (picked, reuse) => {
    if (!reuse && !picked?.length) return;
    if (!reuse && list) list.innerHTML = `<p class="text-fg2">Reading ${picked.length.toLocaleString('en-US')} files…</p>`;
    const index = await indexes[against];
    if (!index?.c) {
      const msg = against === 'launched'
        ? 'Latest scripts are not loaded. Reload the page.'
        : 'Experimental snapshot is missing. Run npm run experimental, then reload.';
      if (list) list.innerHTML = `<p class="text-fg2">${msg}</p>`;
      return;
    }

    if (!reuse) {
      const scripts = [];
      const card = {
        name: '', author: '', authorID: '', version: '', overview: '', tooltip: '', credits: '', inputs: '',
        action: '', actionName: '', workshop: '', prefixes: [], folder: '',
      };
      const warnings = [];
      const strings = new Map();
      const take = (info, { prefer } = {}) => {
        for (const k of Object.keys(info)) {
          if (!info[k]) continue;
          if (prefer || !card[k]) card[k] = info[k];
        }
      };
      const addPrefix = (raw) => {
        const prefix = String(raw).replace(/\\/g, '/').replace(/\/+$/, '').split('/').filter(Boolean).pop() || '';
        if (prefix && !card.prefixes.includes(prefix)) card.prefixes.push(prefix);
      };
      card.folder = dropFolderName(picked);
      for (const { file, path } of picked) {
        const rel = path || file.name;
        const base = file.name.toLowerCase();
        if (rel.split('/').includes('node_modules')) continue;
        if (base === 'stringtable.csv') {
          for (const [k, v] of readStringtable(await file.text())) strings.set(k, v);
          continue;
        }
        if (base === 'meta.cpp') {
          const meta = readMetaCpp(await file.text());
          if (!card.workshop && meta.workshop) card.workshop = meta.workshop;
          if (!card.name && meta.name) card.name = meta.name;
          continue;
        }
        if (base === 'mod.cpp') {
          take(readModCpp(await file.text()), { prefer: true });
          continue;
        }
        if (base === 'config.cpp') {
          take(readCfgMods(await file.text()));
          continue;
        }
        if (base === '$pboprefix$') {
          addPrefix(await file.text());
          continue;
        }
        if (base.endsWith('.pbo')) {
          const pbo = readPbo(await file.arrayBuffer());
          if (!pbo) {
            warnings.push(`${rel} — not a PBO this page can read.`);
            continue;
          }
          if (pbo.props.prefix) addPrefix(pbo.props.prefix);
          if (!card.version && pbo.props.version) card.version = pbo.props.version;
          if (pbo.compressed) warnings.push(`${rel} — ${pbo.compressed} compressed scripts skipped`);
          for (const f of pbo.files) scripts.push({ path: `${rel}/${f.path}`, text: f.text });
          continue;
        }
        if (base.endsWith('.c') || (base.endsWith('.cpp') && base !== 'config.cpp' && base !== 'mod.cpp' && base !== 'meta.cpp')) {
          scripts.push({ path: rel, text: await file.text() });
        }
      }
      for (const k of ['name', 'author', 'overview', 'tooltip', 'credits', 'actionName']) {
        card[k] = resolveStr(card[k], strings);
      }
      if (!card.workshop && card.action) card.workshop = workshopFromUrl(card.action);
      cache = { scripts, html: modCardHtml(card, warnings) };
    }

    // Gone checks need an older baseline. Latest has nothing newer to remove from.
    rows = analyze(cache.scripts, index, against === 'experimental' ? await indexes.launched : null);
    results.innerHTML = cache.html;
    if (hint) hint.hidden = true;
    if (selectBtn) selectBtn.hidden = true;
    paint();
  };

  input.addEventListener('change', () => {
    const picked = [...input.files].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
    input.value = '';
    readPicked(picked);
  });

  results.addEventListener('click', (e) => {
    if (e.target.closest('[data-mod-pick]')) input.click();
  });

  const wireDropTarget = (el) => {
    if (!el || el.dataset.dropWired) return;
    el.dataset.dropWired = '1';
    const arm = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      el.classList.add('border-accent2', 'bg-bg2');
    };
    const disarm = () => {
      el.classList.remove('border-accent2', 'bg-bg2');
    };
    el.addEventListener('dragenter', arm);
    el.addEventListener('dragover', arm);
    el.addEventListener('dragleave', (e) => {
      if (el.contains(e.relatedTarget)) return;
      disarm();
    });
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      disarm();
      readPicked(await filesFromDrop(e.dataTransfer));
    });
  };

  wireDropTarget(drop);
}
