/* The callout above a page that is not the latest copy. Red when the type
   was removed, amber for experimental, blue otherwise. Look: .stale-banner
   in site/styles/history.css. */

import { tag } from './tag.js';

/**
 * @param {object} opts
 * @param {boolean} [opts.removed]
 * @param {'note'|'warn'|'removed'} [opts.kind]  Overrides removed; warn = experimental
 * @param {string} [opts.label]  Tag text; defaults from kind
 * @param {string} [opts.text]  Sentence after the tag
 * @param {string} [opts.href]
 * @param {string} [opts.link]  Defaults to "View latest"
 */
export function banner({
  removed = false,
  kind,
  label,
  text = '',
  href,
  link = 'View latest',
} = {}) {
  const k = kind || (removed ? 'removed' : 'note');
  const labelText = label || (k === 'removed' ? 'Removed' : k === 'warn' ? 'Experimental' : 'Archive');
  const el = document.createElement('p');
  el.className = (k === 'removed' ? 'doc-removed' : 'doc-note') + ' stale-banner';
  el.append(tag(labelText, { kind: k }));
  if (text) el.append(document.createTextNode(text.startsWith(' ') ? text : ` ${text}`));
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = link;
    el.append(a, document.createTextNode('.'));
  }
  return el;
}
