/* Loads an archived build page. Pretty /v/<build>/… URLs are a Netlify rewrite
   to /archive.html; identical pages are fetched from the latest build, and
   pages that differ are filled from /_b/<sha> into the layout template. */
(() => {
  'use strict';
  const MARK = { title: '§T§', desc: '§D§', base: '§B§', vpath: '§P§', bar: '§R§', aside: '§A§', inner: '§C§' };
  const SITE = 'DIFF, DayZ Internal File Finder by YADZ';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const timed = () => AbortSignal.timeout(15000);

  const m = location.pathname.match(/^\/v\/([^/]+)\/(.*)$/);
  if (!m) return;
  const build = m[1];
  let rel = m[2];
  if (rel && !rel.endsWith('/') && !rel.includes('.')) rel += '/';

  const fill = (tpl, meta, inner) =>
    tpl
      .replaceAll(`${MARK.title} · ${SITE}`, esc(meta.title))
      .replaceAll(MARK.desc, esc(meta.description))
      .replaceAll(MARK.vpath, esc(meta.vpath))
      .replaceAll(MARK.base, meta.base)
      .replaceAll(MARK.bar, meta.bar || '')
      .replaceAll(MARK.aside, meta.aside || '')
      .replaceAll(MARK.inner, inner);

  const write = (html) => {
    document.open();
    document.write(html);
    document.close();
  };

  const fail = () => {
    document.body.innerHTML = '<p class="muted" style="padding:2rem">This page could not be loaded.</p>';
  };

  const maps = {};
  const cacheKey = (b) => `pages:${b}`;

  const loadMap = async (b) => {
    if (!maps[b]) {
      try {
        const cached = sessionStorage.getItem(cacheKey(b));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') maps[b] = parsed;
        }
      } catch {}
    }
    if (!maps[b]) {
      const res = await fetch(`/v/${b}/pages.json`, { signal: timed() });
      maps[b] = res.ok ? await res.json() : {};
    }
    return maps[b];
  };

  // Stringifying pages.json is hundreds of KB and would keep the shell on
  // "Loading…" — paint first, cache once the document is already replaced.
  const cacheMap = (b) => {
    const map = maps[b];
    if (!map || !Object.keys(map).length) return;
    try { sessionStorage.setItem(cacheKey(b), JSON.stringify(map)); } catch {}
  };

  (async () => {
    const map = await loadMap(build);
    const sha = map[rel];
    if (!sha) {
      const res = await fetch(`/${rel}`, { signal: timed() });
      if (!res.ok) {
        write(await fetch('/404.html', { signal: timed() }).then((r) => r.text()));
        return;
      }
      write(await res.text());
      cacheMap(build);
      return;
    }
    const [packedRes, tplRes] = await Promise.all([
      fetch(`/_b/${sha}`, { signal: timed() }),
      fetch('/archive.tpl', { signal: timed() }),
    ]);
    if (!packedRes.ok || !tplRes.ok) throw new Error('missing archive body');
    const [packed, tpl] = await Promise.all([packedRes.text(), tplRes.text()]);
    const i = packed.indexOf('\n');
    if (i < 0) throw new Error('bad archive body');
    const meta = JSON.parse(packed.slice(0, i));
    write(fill(tpl, meta, packed.slice(i + 1)));
    cacheMap(build);
  })().catch(fail);
})();
