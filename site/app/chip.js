/* The outlined chip used for title actions, member-row affordances, share
   buttons, and history badges. One class, one factory — change the look in
   styles.css (.chip) and every variant follows. */

import { tip } from './tooltip.js';

/**
 * @param {object} opts
 * @param {'button'|'a'} [opts.tag]
 * @param {string} [opts.className]  Variant classes after `chip`
 * @param {string} [opts.tip]        Tooltip text (via tip())
 * @param {string} [opts.label]      aria-label when tip is the longer hint
 * @param {string} [opts.text]       Visible text; omit when CSS ::before draws it
 */
export function chip({ tag = 'button', className = '', tip: tipText, label, text } = {}) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  el.className = className ? `chip ${className}` : 'chip';
  if (tipText) tip(el, tipText, { label });
  else if (label) el.setAttribute('aria-label', label);
  if (text != null) el.textContent = text;
  return el;
}
