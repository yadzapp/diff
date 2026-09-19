/* The 32px toggle used to narrow a list — Additions, Removals. Pressed is
   aria-pressed, not a second class. Look: site/styles/controls.css (.btn). */

import { tip } from './tooltip.js';

/**
 * @param {object} opts
 * @param {string} [opts.text]
 * @param {boolean} [opts.pressed]
 * @param {string} [opts.className]
 * @param {string} [opts.tip]
 * @param {string} [opts.label]
 */
export function button({ text = '', pressed = false, className = '', tip: tipText, label } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className ? `btn ${className}` : 'btn';
  el.textContent = text;
  if (pressed) el.setAttribute('aria-pressed', 'true');
  if (tipText) tip(el, tipText, { label });
  else if (label) el.setAttribute('aria-label', label);
  return el;
}
