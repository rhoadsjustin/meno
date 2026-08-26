/**
 * Meno design tokens — "Lapis & vellum" (docs/07-design-system.md §3–5).
 */
import { Platform } from 'react-native';

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

/** Screen margins 20pt; card padding 16pt (07 §5). */
export const layout = {
  screenMargin: spacing.xl,
  cardPadding: spacing.lg,
} as const;

/** Continuous corners: 12pt cards, 24pt sheets, capsule buttons (07 §5). */
export const radius = {
  card: 12,
  sheet: 24,
  capsule: 999,
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

/** Reader verse setting: NY Medium 22/34, user-adjustable 18–28 (07 §4). */
export const scriptureType = {
  defaultSize: 22,
  defaultLineHeight: 34,
  minSize: 18,
  maxSize: 28,
} as const;
