/* The uppercase label on callouts — Archive, Note, Warning, Removed, Community
   note. Colour variants are explicit classes so a specimen stands alone;
   nested in .doc-note / .doc-warning / .doc-removed the parent still tints a
   bare .note-tag. */

/**
 * @param {string} text
 * @param {object} [opts]
 * @param {'note'|'warn'|'removed'} [opts.kind]  note = blue, warn = amber, removed = red
 */
export function tag(text, { kind } = {}) {
  const el = document.createElement('span');
  el.className = kind ? `note-tag note-tag-${kind}` : 'note-tag';
  el.textContent = text;
  return el;
}
