/* The outlined chip used for title actions, member-row affordances, share
   buttons, and history badges. One class, one factory — change the look in
   styles.css (.chip) and every variant follows. */

/**
 * @param {object} opts
 * @param {'button'|'a'} [opts.tag]
 * @param {string} [opts.className]  Variant classes after `chip`
 * @param {string} [opts.tip]        data-tip; also aria-label when label is omitted
 * @param {string} [opts.label]      aria-label (when tip is the longer hint)
 * @param {string} [opts.text]       Visible text; omit when CSS ::before draws it
 */
export function chip({ tag = 'button', className = '', tip, label, text } = {}) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  el.className = className ? `chip ${className}` : 'chip';
  if (tip) el.dataset.tip = tip;
  const aria = label || tip;
  if (aria) el.setAttribute('aria-label', aria);
  if (text != null) el.textContent = text;
  return el;
}
