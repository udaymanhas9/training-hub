# Theming

**Rule: add a token, never a hex.** All palette values live in `styles/theme.css`. `npm run check:colors` (and CI) fails on any hex or `rgb(` literal elsewhere.

## Tiers
- **Primitives** (`--slate-600`, `--red-500-rgb`): raw palette. Components never reference them.
- **Semantic tokens** (`--text-faint`, `--accent`, `--surface-2`): named by role, point at primitives. Components use these only. A theme remaps semantic tokens.

## Using them
- Inline style / CSS string: `'var(--text-faint)'`, or `c.textFaint` from `lib/theme.ts` (typed).
- Alpha on a token: `rgb(var(--accent-rgb) / .15)`. Chromatic tokens have an `-rgb` channel triplet.
- Overlay whites/blacks: `rgb(var(--ink-rgb) / .07)` (flips per theme), `rgb(var(--shadow-rgb) / .5)`.
- Alpha on any colour, including DB-stored hex: `tint(color, 0.15)` (`color-mix`; needs Safari 16.2+).
- Tailwind: `bg-surface`, `text-text-muted`, `bg-accent/20` — mapped in `tailwind.config.js`.
- Brand colours (`--brand-*`) are fixed and never themed.
- `<canvas>` can't use `var()`: resolve with `getComputedStyle(document.documentElement).getPropertyValue('--x')` and re-resolve on theme change.

## Adding a token
1. Add a primitive + semantic token in `styles/theme.css` (dark), override in `[data-theme="light"]`.
2. Add the key to `c` in `lib/theme.ts` (and `tailwind.config.js` if needed). The checker verifies theme.css ↔ theme.ts sync.

## Adding a theme
Add a `[data-theme="name"]` block in `theme.css` that overrides semantic tokens (and `--ink-rgb`), add the name to `THEMES` in `lib/theme.ts`.

## Known exceptions
- `/lab/*` is pinned to the dark tokens by `components/ui/ThemeScope.tsx` (terminal aesthetic), whatever theme the user picks.
- `lib/defaultData.ts`: seed data stored in `workout_definitions.data` as hex. `resolveColor()` accepts slot names (`chart-3`, `warning`) or legacy hex; migration to slots is optional.
- `public/manifest.json` stays dark (static).
