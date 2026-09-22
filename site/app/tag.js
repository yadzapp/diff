/* The uppercase label on callouts — Archive, Note, Warning, Removed, Community
   note. Colour variants are explicit classes so a specimen stands alone;
   nested in .doc-note / .doc-warning / .doc-removed the parent still tints a
   bare .note-tag. */

/**
 * @param {string} text
 * @param {object} [opts]
 * @param {'note'|'warn'|'removed'} [opts.kind]  note = blue, warn = amber, removed = red
 * @param {'sm'} [opts.size]  sm = 16px, for tight chrome like the version picker
 */
export function tag(text, { kind, size } = {}) {
  const el = document.createElement('span');
  el.className = [
    'note-tag',
    kind && `note-tag-${kind}`,
    size === 'sm' && 'note-tag-sm',
  ].filter(Boolean).join(' ');
  el.textContent = text;
  return el;
}
