/**
 * Meno design tokens — "Lapis & vellum" (docs/07-design-system.md §3–5).
 */
import { Platform } from 'react-native';

import { breakpoints } from '@/theme/breakpoints';

export { palette, type ColorScheme, type ThemeColors, type ColorToken } from '@/theme/palette';

/** 4pt base grid (07 §5). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Screen margins 20pt; card padding 16pt (07 §5).
 *
 * `maxContentWidth` caps reading content on wide windows (iPhone Duo's inner
 * display, Split View): ~65–75 characters of New York at the default size.
 * `wideBreakpoint` is where a window stops being "a phone" — Apple's iPhone
 * Duo guidance is to decide layout from the window's width, never from the
 * device idiom or orientation.
 */
export const layout = {
  screenMargin: spacing.xl,
  cardPadding: spacing.lg,
  maxContentWidth: 680,
  /** Cap for two-pane screens (Today, Stats, Practice): wide enough for a
   * main column plus a rail, narrow enough that neither sprawls on an iPad. */
  maxWideWidth: 1100,
  // wideBreakpoint, extraWideBreakpoint, shortHeight (breakpoints.ts).
  ...breakpoints,
} as const;

/** Continuous corners: 12pt cards, 24pt sheets, capsule buttons (07 §5). */
export const radius = {
  card: 12,
  sheet: 24,
  capsule: 999,
  /** Heat-map squares: a chunk on a goal card, a day in the practice grid. */
  cell: 4,
} as const;

/**
 * Typography (07 §4): Scripture in New York (system serif), UI in SF Pro
 * (system default), first-letters mode in SF Mono. All ship with iOS.
 */
export const fonts = Platform.select({
  ios: {
    scripture: 'ui-serif', // New York
    ui: 'system-ui', // SF Pro
    mono: 'ui-monospace', // SF Mono
  },
  default: {
    scripture: 'serif',
    ui: 'sans-serif',
    mono: 'monospace',
  },
});

/**
 * UI type scale (07 §4): Apple's text styles at the default text size, as
 * size / leading. React Native scales both with Dynamic Type. Spread one
 * into a style (`...textStyle.footnote`) and add weight and colour beside
 * it; `headline` is the one style that carries its own weight.
 *
 * New UI text takes a style from here rather than a literal size. Verse
 * text stays on `scriptureType`, and the large numerals on `displayType`.
 */
export const textStyle = {
  largeTitle: { fontSize: 34, lineHeight: 41 },
  title1: { fontSize: 28, lineHeight: 34 },
  title2: { fontSize: 22, lineHeight: 28 },
  title3: { fontSize: 20, lineHeight: 25 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22 },
  callout: { fontSize: 16, lineHeight: 21 },
  subheadline: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption1: { fontSize: 12, lineHeight: 16 },
  caption2: { fontSize: 11, lineHeight: 13 },
} as const;

/** Display numerals (Stats, the recap, scores): sizes above the text styles. */
export const displayType = {
  small: 40,
  medium: 56,
  large: 96,
} as const;

/** Reader verse setting: NY Medium 22/34, user-adjustable 18–28 (07 §4). */
export const scriptureType = {
  defaultSize: 22,
  defaultLineHeight: 34,
  minSize: 18,
  maxSize: 28,
} as const;
