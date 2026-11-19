/**
 * Meno color tokens — "Lapis & vellum" (docs/07-design-system.md §3).
 * Pure data, no React Native imports (also consumed by app.config.ts).
 *
 * Gold is reserved exclusively for the Memorized state. Never use it as decoration.
 */
export const palette = {
  light: {
    // Deep enough that a white card reads as a panel on it (1.13:1, about
    // what the system's grouped background gives), not as a blur of white.
    surface: '#F4F1EA',
    surfaceRaised: '#FFFFFF',
    ink: '#1A1D26',
    // Body-size text on both light surfaces (4.6:1 on `surface`).
    inkFaint: '#686C79',
    lapis: '#2244AA',
    // Label and glyph colour on a `lapis` (or `error`) fill: 8.5:1.
    onLapis: '#FFFFFF',
    lapisWash: '#E9EEFA',
    // Dark enough for body-size text on both light surfaces (4.6:1).
    gold: '#88671E',
    error: '#B3402E',
    errorWash: '#F9E9E4',
    success: '#2D7A59',
    amber: '#9A5B13',
    amberWash: '#F8EEDD',
    separator: 'rgba(26, 29, 38, 0.12)',
  },
  dark: {
    surface: '#10131A',
    surfaceRaised: '#181C26',
    ink: '#E9E7E1',
    inkFaint: '#8B8F9C',
    lapis: '#5B7FE8',
    // White on the dark-mode lapis is 3.7:1; the night surface is 5.0:1.
    onLapis: '#10131A',
    lapisWash: '#1A2440',
    gold: '#D4AF37',
    error: '#E06A56',
    errorWash: '#3B211C',
    success: '#4CAF8E',
    amber: '#E59A4C',
    amberWash: '#3A2C17',
    separator: 'rgba(233, 231, 225, 0.14)',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = (typeof palette)[ColorScheme];
export type ColorToken = keyof ThemeColors;
