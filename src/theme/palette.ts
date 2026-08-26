/**
 * Meno color tokens — "Lapis & vellum" (docs/07-design-system.md §3).
 * Pure data, no React Native imports (also consumed by app.config.ts).
 *
 * Gold is reserved exclusively for the Memorized state. Never use it as decoration.
 */
export const palette = {
  light: {
    surface: '#FBFAF7',
    surfaceRaised: '#FFFFFF',
    ink: '#1A1D26',
    inkFaint: '#6E7280',
    lapis: '#2244AA',
    lapisWash: '#E9EEFA',
    gold: '#A8802E',
    error: '#B3402E',
    success: '#2E7D5B',
    separator: 'rgba(26, 29, 38, 0.12)',
  },
  dark: {
    surface: '#10131A',
    surfaceRaised: '#181C26',
    ink: '#E9E7E1',
    inkFaint: '#8B8F9C',
    lapis: '#5B7FE8',
    lapisWash: '#1A2440',
    gold: '#D4AF37',
    error: '#E06A56',
    success: '#4CAF8E',
    separator: 'rgba(233, 231, 225, 0.14)',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = (typeof palette)[ColorScheme];
export type ColorToken = keyof ThemeColors;
