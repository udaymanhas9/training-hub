// Typed handle on styles/theme.css. Palette values live ONLY in theme.css —
// this file holds names (var() references) and helpers.
// scripts/check-colors.mjs fails if the two drift.

const v = <T extends string>(name: T) => `var(--${name})` as `var(--${T})`;

export const c = {
  bg: v('bg'), surface: v('surface'), surface1: v('surface-1'), surface2: v('surface-2'),
  surface3: v('surface-3'), surface4: v('surface-4'), surface5: v('surface-5'), surfaceBlue: v('surface-blue'),
  border: v('border'), borderStrong: v('border-strong'),
  textStrong: v('text-strong'), text: v('text'), textSoft: v('text-soft'), textSoft2: v('text-soft-2'),
  textMuted: v('text-muted'), textSubtle: v('text-subtle'), textFaint: v('text-faint'), textGhost: v('text-ghost'),
  textNeutral: v('text-neutral'), textNeutralFaint: v('text-neutral-faint'), textNeutralDim: v('text-neutral-dim'),
  textNeutralMid: v('text-neutral-mid'), textNeutralLow: v('text-neutral-low'), textNeutralGhost: v('text-neutral-ghost'),
  scrim: v('scrim'),
  accent: v('accent'), danger: v('danger'), dangerSoft: v('danger-soft'), pink: v('pink'),
  success: v('success'), success2: v('success-2'), success3: v('success-3'), success4: v('success-4'),
  info: v('info'), info2: v('info-2'), info3: v('info-3'),
  warning: v('warning'), warning2: v('warning-2'), orange: v('orange'),
  violet: v('violet'), violet2: v('violet-2'), indigo: v('indigo'), indigo2: v('indigo-2'),
  cyan: v('cyan'), magenta: v('magenta'), gold: v('gold'),
  yellow: v('yellow'), yellow2: v('yellow-2'), lime: v('lime'), purple: v('purple'), sky: v('sky'), orange2: v('orange-2'),
  dangerPale: v('danger-pale'), warningDark: v('warning-dark'), orangeDark: v('orange-dark'), stone: v('stone'),
  indigoDark: v('indigo-dark'), infoDark: v('info-dark'), infoPale: v('info-pale'), navy: v('navy'),
  chart1: v('chart-1'), chart2: v('chart-2'), chart3: v('chart-3'), chart4: v('chart-4'),
  chart5: v('chart-5'), chart6: v('chart-6'), chart7: v('chart-7'), chart8: v('chart-8'),
  brandStrava: v('brand-strava'), brandLeetcode: v('brand-leetcode'),
} as const;

export type ColorToken = keyof typeof c;

/** Alpha tint that works for tokens (`var(--x)`) and raw/DB-stored hex alike. */
export function tint(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 1000) / 10}%, transparent)`;
}

/** Overlay ink (white in dark, near-black in light) at a given alpha. */
export const ink = (alpha: number) => `rgb(var(--ink-rgb) / ${alpha})`;

/** Slot names that may be stored in the DB in place of raw hex. */
const SLOTS: Record<string, string> = {
  accent: c.accent, success: c.success, warning: c.warning, danger: c.danger, info: c.info,
  'chart-1': c.chart1, 'chart-2': c.chart2, 'chart-3': c.chart3, 'chart-4': c.chart4,
  'chart-5': c.chart5, 'chart-6': c.chart6, 'chart-7': c.chart7, 'chart-8': c.chart8,
};

/** Map a stored value to a CSS colour: slot name → var(); legacy hex passes through. */
export function resolveColor(stored: string): string {
  return SLOTS[stored] ?? stored;
}

export const THEMES = ['dark', 'light'] as const;
export type ThemeName = (typeof THEMES)[number];
export const THEME_STORAGE_KEY = 'th-theme';
export const THEME_META_COLOR: Record<ThemeName, string> = { dark: '#0a0a0a', light: '#f5f6f8' };

export function applyTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_META_COLOR[t]);
  try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch {}
}

// ── Values persisted in the DB ────────────────────────────────────────────────
// These end up in workout_definitions.data / todo_board.data and are compared
// against stored values, so they must stay raw hex (var() would never match).
// Migrating them to slot names is covered by resolveColor() — optional.
export const ACCENT_CHOICES = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'] as const;
export const PHASE_COLOR_CHOICES = [
  '#f59e0b', '#ef4444', '#f97316', '#3b82f6', '#10b981',
  '#8b5cf6', '#ec4899', '#64748b', '#84cc16', '#06b6d4',
] as const;
export const DEFAULT_CUSTOM_COLOR = '#8b5cf6';
export const DEFAULT_LABEL_COLORS = {
  green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', blue: '#3b82f6', sky: '#38bdf8', slate: '#64748b',
} as const;
