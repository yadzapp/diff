/* The callout above a page that is not the latest copy. Red when the type
   was removed, blue otherwise. Look: .stale-banner in site/styles/history.css. */

import { tag } from './tag.js';

/**
 * @param {object} opts
 * @param {boolean} [opts.removed]
 * @param {string} [opts.text]  Sentence after the tag
 * @param {string} [opts.href]
 * @param {string} [opts.link]  Defaults to "View latest"
 */
export function banner({ removed = false, text = '', href, link = 'View latest' } = {}) {
  const el = document.createElement('p');
  el.className = removed ? 'doc-removed stale-banner' : 'doc-note stale-banner';
  el.append(tag(removed ? 'Removed' : 'Archive', { kind: removed ? 'removed' : 'note' }));
  if (text) el.append(document.createTextNode(text.startsWith(' ') ? text : ` ${text}`));
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = link;
    el.append(a, document.createTextNode('.'));
  }
  return el;
}
