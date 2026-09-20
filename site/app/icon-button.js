/* Square control with an icon and no word. Size and chrome are the variant.
   Change the look in site/styles/controls.css (.icon-btn) and every one follows. */

import { tip } from './tooltip.js';

/**
 * @param {object} opts
 * @param {'button'|'a'} [opts.tag]
 * @param {string} [opts.variant]     Space-separated: sm, solid, lg
 * @param {string} [opts.icon]        Icon name, the part after `ic-`
 * @param {string} [opts.className]   Hook classes after the variant
 * @param {string} [opts.tip]
 * @param {string} [opts.key]
 * @param {string} [opts.label]       aria-label when it should differ from tip
 */
export function iconButton({
  tag = 'button',
  variant = '',
  icon,
  className = '',
  tip: tipText,
  key,
  label,
} = {}) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  const variants = String(variant).split(/\s+/).filter(Boolean).map((v) => `icon-btn-${v}`);
  el.className = ['icon-btn', ...variants, className].filter(Boolean).join(' ');
  if (tipText) tip(el, tipText, { key, label });
  else if (label) el.setAttribute('aria-label', label);
  if (icon) {
    const i = document.createElement('i');
    i.className = `ic ic-${icon}`;
    i.setAttribute('aria-hidden', 'true');
    el.append(i);
  }
  return el;
}
