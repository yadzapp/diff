/* Which styleguide sections are open, across reloads. */

const KEY = 'sg-sections';

export function initStyleguide() {
  const secs = document.querySelectorAll('.sg-sec');
  if (!secs.length) return;

  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    saved = {};
  }

  for (const sec of secs) {
    const id = sec.id;
    if (typeof saved[id] === 'boolean') sec.open = saved[id];
    sec.addEventListener('toggle', () => {
      saved[id] = sec.open;
      try {
        localStorage.setItem(KEY, JSON.stringify(saved));
      } catch {
        /* private mode / full */
      }
    });
  }
}
