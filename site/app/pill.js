/* The travelling highlight, for any list of rows you pick one of.

   The rail is where it started (site/app/sidebar.js) and the version switcher
   is the other list on the page with a current row and rows you consider
   instead of it (site/app/builds.js), so both ask for it here rather than each
   lighting their own rows their own way. */

import { $ } from './dom.js';

/**
 * Two lit shapes for the whole list, rather than one per row.
 *
 * One rests on the row you are on and stays there. The other travels to
 * whatever the pointer or the keyboard is on and leaves with it. They are
 * separate because they are separate claims: where you are does not stop being
 * true while you consider going somewhere else, and a single shape that slid
 * away on hover took the answer with it.
 *
 * They never share a row. Point at the row you are already on and the
 * travelling one gets out of the way, because lighting a row twice says
 * nothing the resting shape has not already said.
 *
 * Each is measured off the row it is going to, so it takes that row's indent
 * and height and a nested row is not the same size as a section heading.
 * Measuring means offsets, so anything that moves the rows — a section
 * opening, the window resizing, the rail being dragged narrower, a menu being
 * opened for the first time — has to say so.
 *
 * Marking the list is what turns the per-row backgrounds in the stylesheet
 * off, so a list with no script running keeps a plain hover and a plain
 * current row instead of losing both.
 *
 * @param {Element} box The list. Must be a positioned element.
 * @param {{rows: string, home: string[]}} of What a row is, and where the
 *   resting shape belongs — the first of those selectors that matches a row
 *   which is actually showing.
 */
export function travel(box, of) {
  if (!box) return null;
  const make = (cls) => {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    box.prepend(el);
    return el;
  };
  const resting = make('nav-pill home');
  const roving = make('nav-pill');
  box.classList.add('travels');

  /**
   * Whether a row is on screen to be sat on.
   *
   * Not offsetParent, and not a client rect either. A shut <details> hides its
   * contents with content-visibility rather than display in current browsers,
   * and a subtree skipped that way still answers every offset and rect it had
   * when it was last laid out — so the shape would take a position inside a
   * section that is not showing and strand itself over whatever row happens to
   * be there. checkVisibility is the one test that reads it as hidden; where
   * it is missing, so is content-visibility, and display:none is what shut
   * means.
   */
  const shown = (el) => (el ? (el.checkVisibility?.() ?? !!el.offsetParent) : false);

  /**
   * Where it rests. The row you are on, and failing that whatever stands in
   * for it — in the rail, the section holding a page inside a shut fold, which
   * is the only way it can say which page you are on without being opened
   * first.
   */
  const home = () => {
    for (const sel of of.home) {
      const el = $(sel, box);
      if (shown(el)) return el;
    }
    return null;
  };

  const on = new Map();

  const put = (pill, row, instant = false) => {
    if (on.get(pill) === row) return;
    on.set(pill, row);
    const jump = instant || !pill.classList.contains('on');
    if (jump) pill.style.transition = 'none';
    if (!shown(row)) {
      pill.classList.remove('on');
      if (jump) {
        void pill.offsetWidth;
        pill.style.transition = '';
      }
      return;
    }
    // A shape that is not showing has nowhere to travel from: a menu that was
    // opened has rows its shapes have never stood on, and sliding in from the
    // last ones — or from the corner — is motion about the menu rather than
    // about the row. Placed first, then allowed to move.
    pill.style.transform = `translate(${row.offsetLeft}px, ${row.offsetTop}px)`;
    pill.style.width = `${row.offsetWidth}px`;
    pill.style.height = `${row.offsetHeight}px`;
    pill.classList.add('on');
    if (jump) {
      void pill.offsetWidth;
      pill.style.transition = '';
    }
  };

  /** Point at the row you are already on and the travelling shape stands down. */
  const rove = (row, instant = false) => put(roving, row === home() ? null : row, instant);
  const rest = () => put(resting, home());
  /** After anything that moved the rows: put both back where they now belong. */
  const remeasure = () => {
    // A list that is filled in the browser replaces everything under it, the
    // shapes included, so they are put back before they are asked to measure.
    if (!resting.isConnected) box.prepend(resting);
    if (!roving.isConnected) box.prepend(roving);
    const was = on.get(roving);
    on.clear();
    rest();
    if (shown(was)) rove(was);
  };

  box.addEventListener('pointerover', (e) => {
    const row = e.target.closest?.(of.rows);
    if (row) rove(row);
  });
  box.addEventListener('pointerleave', () => rove(null));
  box.addEventListener('focusin', (e) => {
    const row = e.target.closest?.(of.rows);
    if (row) rove(row, true);
  });
  box.addEventListener('focusout', (e) => {
    if (!box.contains(e.relatedTarget)) rove(null);
  });
  // <details> does not bubble its toggle, so this has to go down to meet it.
  box.addEventListener('toggle', remeasure, true);
  addEventListener('resize', remeasure);

  rest();
  // Placed before either is allowed to move, or their first appearance is a
  // slide in from the top left corner. A frame later the web font has settled.
  requestAnimationFrame(() => {
    remeasure();
    resting.classList.add('set');
    roving.classList.add('set');
  });

  return { remeasure, rove };
}
