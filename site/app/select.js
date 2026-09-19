/* A build picker. `field` is the labelled native select (From / To). `ghost`
   is the borderless trigger that opens a menu. Look: site/styles/controls.css. */

/**
 * @param {object} opts
 * @param {'field'|'ghost'} [opts.variant]
 * @param {string} [opts.kicker]  Field prefix, e.g. "To"
 * @param {string} [opts.face]    Text drawn over the native select
 * @param {string} [opts.text]    Ghost trigger text
 * @param {string} [opts.label]   aria-label
 */
export function select({ variant = 'field', kicker, face = '', text = '', label } = {}) {
  if (variant === 'ghost') {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'select-ghost';
    el.setAttribute('aria-haspopup', 'true');
    if (label) el.setAttribute('aria-label', label);
    const span = document.createElement('span');
    span.textContent = text;
    const ic = document.createElement('i');
    ic.className = 'ic ic-chev';
    ic.setAttribute('aria-hidden', 'true');
    el.append(span, ic);
    return el;
  }

  const wrap = document.createElement('label');
  wrap.className = 'select';
  if (kicker) {
    const k = document.createElement('span');
    k.className = 'select-kicker';
    k.textContent = kicker;
    wrap.append(k);
  }
  const faceEl = document.createElement('span');
  faceEl.className = 'select-face';
  if (face) faceEl.dataset.face = face;
  const sel = document.createElement('select');
  if (label) sel.setAttribute('aria-label', label);
  faceEl.append(sel);
  wrap.append(faceEl);
  return wrap;
}
