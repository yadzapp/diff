/* One tooltip.

   Icon-only controls opt in with data-tip. Native title is the OS's box a
   second later; this is the same words, on the site's type. Placement is
   the same bargain Base UI's Positioner strikes: prefer above, flip below
   if the header or the window edge is in the way, then try left and right,
   and slide along the other axis so a control in a corner does not push
   the box off the screen. One node, because a page can grow many of these
   and only one is ever showing. */

const GAP = 6;
const PAD = 8;
const DELAY = 350;

function chromeTop() {
  const css = getComputedStyle(document.documentElement);
  return (parseFloat(css.getPropertyValue('--h-top')) || 0)
    + (parseFloat(css.getPropertyValue('--h-bar')) || 0);
}

function view() {
  const vv = window.visualViewport;
  return {
    x: vv?.offsetLeft ?? 0,
    y: vv?.offsetTop ?? 0,
    w: vv?.width ?? window.innerWidth,
    h: vv?.height ?? window.innerHeight,
  };
}

/** Prefer top, then bottom, then the sides. Slide only on the other axis,
    the way Base UI flips `side` and shifts `align`. The sticky chrome is
    a floor only when the host lives below it — a control in the header
    would otherwise be pushed into the page.

    `r` is what the box is being hung off: usually the control's own rect,
    but a control that is a long strip hands over the pointer instead. */
function fit(r, tw, th) {
  const v = view();
  const chrome = chromeTop();
  const minX = v.x + PAD;
  const maxX = v.x + v.w - PAD;
  const minY = v.y + (r.top < chrome ? PAD : chrome + PAD);
  const maxY = v.y + v.h - PAD;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const clamp = (n, lo, hi) => (hi < lo ? lo : Math.min(Math.max(n, lo), hi));
  const midX = clamp(cx - tw / 2, minX, maxX - tw);
  const midY = clamp(cy - th / 2, minY, maxY - th);

  const tries = [
    { left: midX, top: r.top - th - GAP, origin: 'bottom center' },
    { left: midX, top: r.bottom + GAP, origin: 'top center' },
    { left: r.left - tw - GAP, top: midY, origin: 'center right' },
    { left: r.right + GAP, top: midY, origin: 'center left' },
  ];
  let best = tries[0];
  let bestOverflow = Infinity;
  for (const t of tries) {
    const overflow =
      Math.max(0, minX - t.left) + Math.max(0, t.left + tw - maxX)
      + Math.max(0, minY - t.top) + Math.max(0, t.top + th - maxY);
    if (overflow < bestOverflow) {
      best = t;
      bestOverflow = overflow;
      if (!overflow) break;
    }
  }
  return best;
}

export function initTooltip() {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  document.body.append(tip);

  let host = null;
  let timer = 0;
  let point = null;
  let queued = 0;

  /**
   * What the box hangs off.
   *
   * The middle of the control, except where the control is a strip rather
   * than a button: the sidebar's edge is fourteen pixels wide and as tall as
   * the window, and its middle is several hundred pixels from wherever the
   * pointer actually is. Those mark themselves with data-tip-follow and hand
   * over the pointer as a point with no size, which the placement above then
   * treats as a very small control — so it still flips off the window edges
   * near the top and bottom of the screen.
   */
  function anchor() {
    if (host.dataset.tipFollow !== undefined && point) {
      const { x, y } = point;
      return { left: x, right: x, top: y, bottom: y, width: 0, height: 0 };
    }
    return host.getBoundingClientRect();
  }

  function place() {
    if (!host) return;
    const tw = tip.scrollWidth;
    const th = tip.scrollHeight;
    if (!tw || !th) return;
    const { left, top, origin } = fit(anchor(), tw, th);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.transformOrigin = origin;
  }

  function reveal() {
    if (!host) return;
    tip.replaceChildren(host.dataset.tip || '');
    // The key that does the same thing, as a key rather than as more of the
    // sentence. A control worth a shortcut is one worth using twice, and the
    // second time is faster from the keyboard — but only if the tooltip that
    // taught it read as a key and not as punctuation. Same cap the search
    // button wears and the same one the ? list is made of, so a reader meets
    // one shape for "press this" in all three places.
    if (host.dataset.key) {
      const kbd = document.createElement('kbd');
      kbd.textContent = host.dataset.key;
      tip.append(kbd);
    }
    if (host.target === '_blank') {
      const ic = document.createElement('i');
      ic.className = 'ic ic-ext';
      ic.setAttribute('aria-hidden', 'true');
      tip.append(ic);
    }
    place();
    tip.classList.add('on');
    place();
  }

  function arm(el) {
    if (el === host) return;
    clearTimeout(timer);
    const skip = tip.classList.contains('on');
    host = el;
    // Once one tip is open, neighbouring controls open instantly — same as
    // toolbars that skip the hover delay after the first reveal.
    if (skip) {
      tip.classList.add('instant');
      reveal();
      return;
    }
    tip.classList.remove('instant');
    timer = setTimeout(reveal, DELAY);
  }

  function disarm() {
    if (!host && !timer) return;
    clearTimeout(timer);
    timer = 0;
    host = null;
    point = null;
    tip.classList.remove('on', 'instant');
  }

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) {
      disarm();
      return;
    }
    point = { x: e.clientX, y: e.clientY };
    arm(el);
  });
  // Only the strips ask for this, and only while one of them is under the
  // pointer — everything else is already where it is going to stay.
  document.addEventListener('pointermove', (e) => {
    if (!host || host.dataset.tipFollow === undefined) return;
    point = { x: e.clientX, y: e.clientY };
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      place();
    });
  }, { passive: true });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) return;
    // Reached by keyboard, so there is no pointer for it to follow.
    point = null;
    arm(el);
  });
  document.addEventListener('focusout', (e) => {
    if (!e.relatedTarget?.closest?.('[data-tip]')) disarm();
  });
  document.addEventListener('click', disarm);
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
}
