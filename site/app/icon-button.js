/* Square control with an icon and no word.
   Size: sm (24) | md (32, default) | lg (40). Style: gray (default) | white | border.
   Change the look in site/styles/controls.css (.icon-btn) and every one follows. */

import { tip } from './tooltip.js';

/**
 * @param {object} opts
 * @param {'button'|'a'} [opts.tag]
 * @param {'sm'|'md'|'lg'} [opts.size]
 * @param {'gray'|'white'|'border'} [opts.style]
 * @param {string} [opts.icon]        Icon name, the part after `ic-`
 * @param {string} [opts.className]   Hook classes after size/style
 * @param {string} [opts.tip]
 * @param {string} [opts.key]
 * @param {string} [opts.label]       aria-label when it should differ from tip
 */
export function iconButton({
  tag = 'button',
  size = 'md',
  style = 'gray',
  icon,
  className = '',
  tip: tipText,
  key,
  label,
} = {}) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  el.className = [
    'icon-btn',
    size === 'sm' && 'icon-btn-sm',
    size === 'lg' && 'icon-btn-lg',
    `icon-btn-${style}`,
    className,
  ].filter(Boolean).join(' ');
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
