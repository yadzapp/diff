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
  const m = tail.match(/(?:extends|:)\s*([\s\S]+)$/);
  if (!m) return '';
  const ids = m[1].match(/[A-Za-z_]\w*/g);
  return ids ? ids[ids.length - 1] : '';
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

export function moduleOf(path) {
  const m = String(path).replace(/\\/g, '/').match(/(?:^|\/)([1-5]_[A-Za-z]+)\//);
  return m ? m[1].toLowerCase() : '';
}

function sigsMatch(modSig, expSig) {
  const want = normSig(modSig);
  return String(expSig).split('|').some((s) => normSig(s) === want);
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
 * files: { path, text }[] of Enforce sources. index.c is the experimental
 * class map from data/experimental.json.
 */
export function analyze(files, index) {
  const classes = new Map();
  for (const file of files) {
    for (const c of scanSource(file.text)) {
      let e = classes.get(c.name);
      if (!e) classes.set(c.name, (e = { name: c.name, modded: false, base: '', file: file.path, overrides: [] }));
      e.modded = e.modded || c.modded;
      if (c.base) e.base = c.base;
      for (const o of c.overrides) e.overrides.push({ ...o, file: file.path });
    }
  }

  const rows = [];
  for (const c of classes.values()) {
    if (c.modded && !index.c?.[c.name]) {
      rows.push({ status: 'missing-class', cls: c.name, file: c.file });
      continue;
    }
    const start = vanillaStart(c.name, classes, index);
    if (!start) continue;
    const vanillaMod = index.c[start]?.d || '';
    for (const o of c.overrides) {
      const hit = findMethod(index, start, o.name);
      const fileMod = moduleOf(o.file);
      const moduleNote = vanillaMod && fileMod && vanillaMod !== fileMod ? `${fileMod} → ${vanillaMod}` : '';
      if (!hit) {
        rows.push({ status: 'missing-method', cls: c.name, method: o.name, file: o.file, moduleNote });
        continue;
      }
      const same = sigsMatch(o.sig, hit.sig);
      rows.push({
        status: !same ? 'sig' : moduleNote ? 'module' : 'ok',
        cls: c.name,
        method: o.name,
        file: o.file,
        modSig: o.sig,
        expSig: hit.sig,
        owner: hit.owner === start ? '' : hit.owner,
        moduleNote,
      });
    }
  }
  rows.sort((a, b) => RANK[a.status] - RANK[b.status] || a.cls.localeCompare(b.cls) || (a.method || '').localeCompare(b.method || ''));
  return rows;
}

export function readModCpp(text) {
  const get = (k) => text.match(new RegExp(`\\b${k}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] || '';
  return { name: get('name'), author: get('author'), version: get('version') };
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
  'missing-class': ['chip chip-removed', 'Class gone'],
  'missing-method': ['chip chip-removed', 'Method gone'],
  sig: ['chip chip-changed', 'Signature'],
  module: ['chip chip-changed', 'Module'],
  ok: ['chip', 'Matches'],
};

function rowHtml(row) {
  const [cls, label] = LABEL[row.status];
  const name = row.method ? `${row.cls}.${row.method}` : row.cls;
  let detail = '';
  if (row.status === 'sig') detail = `${row.modSig} → ${row.expSig}`;
  else if (row.status === 'missing-class') detail = 'not in experimental';
  else if (row.status === 'missing-method') detail = 'no such method';
  else if (row.owner) detail = `defined on ${row.owner}`;
  if (row.moduleNote) detail = detail ? `${detail} · ${row.moduleNote}` : row.moduleNote;
  return `<li class="flex flex-wrap items-baseline gap-2 text-sm">
  <span class="${cls}">${label}</span>
  <a href="/classes/${encodeURIComponent(row.cls)}/"><code>${esc(name)}</code></a>
  ${detail ? `<span class="text-fg2">${esc(detail)}</span>` : ''}
  <span class="text-fg3 text-xs">${esc(row.file)}</span>
</li>`;
}

function listHtml(rows, mode) {
  const shown = mode === 'all' ? rows : rows.filter((r) => r.status !== 'ok');
  if (!shown.length) {
    const msg = rows.length
      ? 'Nothing in these overrides disagrees with experimental.'
      : 'No modded class or override turned up. Packed scripts inside a compressed PBO are not unpacked — choose the project folder.';
    return `<p class="text-fg2">${msg}</p>`;
  }
  return `<ul class="list-none m-0 p-0 flex flex-col gap-2">${shown.map(rowHtml).join('')}</ul>`;
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

/** A dropped folder, or loose files, as { file, path }. Paths stay in memory. */
async function filesFromDrop(dt) {
  const entries = [...dt.items].map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...dt.files].map((file) => ({ file, path: file.name }));
  const out = [];
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
  return out;
}

export function initModCheck() {
  const input = document.getElementById('modFolder');
  const results = document.getElementById('modResults');
  if (!input || !results) return;
  const filters = document.getElementById('modFilters');
  const issuesBtn = document.getElementById('modIssues');
  const allBtn = document.getElementById('modAll');
  const list = document.getElementById('modList');
  let mode = 'issues';
  let rows = [];

  const paint = () => {
    const issues = rows.filter((r) => r.status !== 'ok');
    if (issuesBtn) issuesBtn.textContent = `Needs a look${issues.length ? ` · ${issues.length}` : ''}`;
    if (allBtn) allBtn.textContent = `All overrides · ${rows.length}`;
    if (list) list.innerHTML = listHtml(rows, mode);
  };
  const press = (next) => {
    mode = next;
    issuesBtn?.setAttribute('aria-pressed', String(next === 'issues'));
    allBtn?.setAttribute('aria-pressed', String(next === 'all'));
    paint();
  };
  issuesBtn?.addEventListener('click', () => press('issues'));
  allBtn?.addEventListener('click', () => press('all'));

  const indexReady = fetch('/assets/experimental.json')
    .then((r) => {
      if (!r.ok) throw new Error('missing');
      return r.json();
    })
    .catch(() => null);

  const readPicked = async (picked) => {
    if (!picked.length) return;
    if (list) list.innerHTML = `<p class="text-fg2">Reading ${picked.length.toLocaleString('en-US')} files…</p>`;
    if (filters) filters.hidden = true;
    const index = await indexReady;
    if (!index?.c) {
      if (list) list.innerHTML = '<p class="text-fg2">Experimental snapshot is missing. Run npm run experimental, then reload.</p>';
      return;
    }

    const scripts = [];
    const notes = [];
    for (const { file, path } of picked) {
      const rel = path || file.name;
      const base = file.name.toLowerCase();
      if (rel.split('/').includes('node_modules')) continue;
      if (base === 'meta.cpp') {
        notes.push(`${rel} — Steam writes this during download. Ignored.`);
        continue;
      }
      if (base === 'mod.cpp') {
        const info = readModCpp(await file.text());
        const bits = [info.name, info.author && `by ${info.author}`, info.version && `v${info.version}`].filter(Boolean);
        notes.push(`${rel}${bits.length ? ` — ${bits.join(', ')}` : ''}`);
        continue;
      }
      if (base === '$pboprefix$') {
        const prefix = (await file.text()).trim();
        notes.push(`${rel}${prefix ? ` — ${prefix}` : ''}`);
        continue;
      }
      if (base.endsWith('.pbo')) {
        const pbo = readPbo(await file.arrayBuffer());
        if (!pbo) {
          notes.push(`${rel} — not a PBO this page can read.`);
          continue;
        }
        const bits = [pbo.props.prefix && `prefix ${pbo.props.prefix}`, pbo.props.product && `product ${pbo.props.product}`, pbo.props.version && `version ${pbo.props.version}`].filter(Boolean);
        const skipped = pbo.compressed ? ` — ${pbo.compressed} compressed scripts skipped` : '';
        notes.push(`${rel}${bits.length ? ` — ${bits.join(', ')}` : ''}${skipped}`);
        for (const f of pbo.files) scripts.push({ path: `${rel}/${f.path}`, text: f.text });
        continue;
      }
      if (base.endsWith('.c') || base.endsWith('.cpp')) scripts.push({ path: rel, text: await file.text() });
    }

    rows = analyze(scripts, index);
    results.innerHTML = notes.length
      ? `<ul class="list-none m-0 mb-4 p-0 flex flex-col gap-1 text-sm text-fg2">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
      : '';
    if (filters) filters.hidden = rows.length === 0;
    paint();
  };

  input.addEventListener('change', () => {
    const picked = [...input.files].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
    input.value = '';
    readPicked(picked);
  });

  const drop = document.getElementById('modDrop');
  if (!drop) return;
  const arm = (e) => {
    e.preventDefault();
    drop.classList.add('border-accent', 'bg-accent-bg');
    drop.classList.remove('border-line');
  };
  const disarm = () => {
    drop.classList.remove('border-accent', 'bg-accent-bg');
    drop.classList.add('border-line');
  };
  drop.addEventListener('dragenter', arm);
  drop.addEventListener('dragover', arm);
  drop.addEventListener('dragleave', (e) => {
    if (drop.contains(e.relatedTarget)) return;
    disarm();
  });
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    disarm();
    readPicked(await filesFromDrop(e.dataTransfer));
  });
}
