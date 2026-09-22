---
name: styleguide
description: >-
  Before creating or editing UI in this project, check the styleguide for
  existing styles and components and reuse them. Applies when adding new
  markup, CSS, render output, site/app modules, chips, tags, tooltips,
  banners, colors, typography, or any shared control; also when the user
  mentions styleguide, design tokens, components, or visual consistency.
---

# Styleguide

**Project-only.** This skill applies to this repository alone.

**Mandatory before writing UI.** When creating a component, editing one, or
changing styles/markup, read the styleguide first. Reuse catalogued styles and
components. Do not invent a parallel class, color, type size, or control.

## Source of truth

| What | Where |
|------|--------|
| Catalogue (specimens + class names) | `src/generate/render/styleguide.js` |
| Color + type tokens | `site/styles/tokens.css` |
| Live page (dev only) | `/styleguide/` |

Each section’s `sg-src` points at the real implementation. Open that file
before changing the pattern.

## When this skill fires

Use this skill whenever you would:

- **Create** a new component, control, CSS class, or shared visual pattern
- **Edit** existing markup, CSS, or `site/app/*` / `src/generate/render/*` UI
- **Add** colors, type sizes, chips, tags, tooltips, banners, or similar

Skip only for pure non-UI work (parse logic, tests with no markup, docs with
no styles).

## Workflow (create or edit)

Copy and follow:

```
Styleguide gate:
- [ ] Opened src/generate/render/styleguide.js
- [ ] Searched for an existing specimen / class / token that fits
- [ ] If found → reused it (same classes, markup shape, modifiers)
- [ ] If found → opened its sg-src and matched conventions
- [ ] If not found → extended the closest pattern OR added a new shared
      class + styleguide section in the same change
- [ ] Colors/type use tokens.css (no one-off hex or font-size)
- [ ] Visual styling is Tailwind utilities on the markup when possible
      (not a new CSS rule / ::before for something utilities cover)
```

### Creating something new

1. Read `styleguide.js` end-to-end enough to know what already exists.
2. Prefer composing existing specimens (e.g. `chip` + modifier, `note-tag`,
   `data-tip`) over a new control.
3. Style with Tailwind utilities on the markup first. Reach for `site/styles/`
   only when a utility cannot express the behavior.
4. If a new shared class is truly needed:
   - Implement it in the normal CSS/JS home (`site/styles/…`, `site/app/…`)
   - Add a section to `styleguide.js` with specimen rows + `sg-src`
   - Use tokens from `tokens.css`; add light + dark if you add a color token

### Editing something existing

1. Find it in the styleguide (or its `sg-src`).
2. Change the implementation file the catalogue points at — keep specimens in
   sync if class names or markup shape change.
3. Do not fork a second visual variant outside the catalogue.

## Catalogue today

| Section | Classes / API | Implementation |
|---------|---------------|----------------|
| Colors | `--bg`, `--fg`, `--accent`, … | `site/styles/tokens.css` |
| Typography | `.text-xs` … `.text-3xl` | `site/styles.css` (@theme) |
| Tag | `note-tag`, `note-tag-note`, `note-tag-warn`, `note-tag-removed`, size `note-tag-sm` | `site/app/tag.js` |
| Chip | `chip`, `chip-added`, `chip-changed`, `chip-removed` | `site/app/chip.js` (+ chips CSS) |
| Button | `btn`, `aria-pressed` | `site/app/button.js` |
| Icon Button | `icon-btn`, size `icon-btn-sm` / `icon-btn-lg`, style `icon-btn-gray` / `icon-btn-white` / `icon-btn-border` | `site/app/icon-button.js` |
| Select | `select`, `select-ghost` | `site/app/select.js` |
| Tooltip | `data-tip`, optional `data-key` | `site/app/tooltip.js` |
| Banner | `doc-note` / `doc-removed` + `stale-banner` + tag (`note` / `warn` / `removed`) | `site/app/banner.js` |

## Rules

- **Reuse modifiers as catalogued** — do not invent alternate naming.
- **Tooltip** — `data-tip` (+ `data-key` for shortcuts), not a custom tooltip.
- **Tokens only** for color and type — `var(--…)` / Tailwind `text-*` utilities from `@theme`.
- **Tailwind on the markup first** — put layout, spacing, type, color, blur, opacity,
  and similar on the HTML / template / `className` string with unprefixed utilities
  (`bg-black/70`, `backdrop-blur-md`, `absolute inset-0`, …). Prefer a real element
  with utilities over a CSS `::before` / custom rule for the same look. Named classes
  (`chip`, `badge`, `side`, `palette`, …) stay for shared controls and JS hooks; add
  rules in `site/styles/` only when utilities cannot express it (complex selectors,
  `.on` enter/exit that is not a `group-[.on]:…` variant, non-utility motion).
- **New color tokens** need light (`:root`), dark (`[data-theme="dark"]` and
  `prefers-color-scheme`), and a Colors row in the styleguide.
- **Styleguide stays development-only** — do not ship it in production.

## When nothing matches

Say so in one line, then either extend the closest pattern or add a minimal
shared class **and** a styleguide specimen in the same change. Never leave a
second undocumented visual language in the site.
