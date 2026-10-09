import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/theme';

/**
 * Scroll content column: full width on phones, a centered reading-width
 * column on wide windows. Spread into a ScrollView's `contentContainerStyle`.
 */
export const contentColumn = {
  width: '100%',
  maxWidth: layout.maxContentWidth,
  alignSelf: 'center',
} as const;

/** The wider cap for screens that lay out two panes side by side. */
export const contentColumnWide = {
  width: '100%',
  maxWidth: layout.maxWideWidth,
  alignSelf: 'center',
} as const;

/**
 * Two-pane layout for wide windows: `row` holds a `main` column (3/5) and an
 * `aside` rail (2/5), or two `half` columns. Each pane keeps the same
 * vertical rhythm as the Screen scaffold so cards stack identically.
 */
export const panes = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  main: { flex: 3, gap: spacing.lg },
  aside: { flex: 2, gap: spacing.lg },
  half: { flex: 1, gap: spacing.lg },
});

/**
 * Window-driven layout (Apple's iPhone Duo guidance: size from the window,
 * not the device). The inner display is regular-width and ignores portrait
 * locks, and every app resizes as the phone opens, closes, rotates or folds,
 * so `useWindowDimensions` is the source of truth and re-renders on each
 * pose change.
 *
 * `sides` carries the horizontal safe-area insets, which are asymmetric on
 * iPhone Duo (status bar and camera sit in one corner) — each side is
 * applied on its own, never mirrored.
 */
export function useContentLayout() {
  const { width, height } = useWindowDimensions();
  const raw = useSafeAreaInsets();
  // With the status bar on a side edge (iPhone Duo opened, landscape phones)
  // the top inset is 0 and titles would touch the bezel; keep a small floor.
  const insets = { ...raw, top: Math.max(raw.top, spacing.md) };
  return {
    width,
    height,
    insets,
    isWide: width >= layout.wideBreakpoint,
    isExtraWide: width >= layout.extraWideBreakpoint,
    sides: { paddingLeft: insets.left, paddingRight: insets.right },
  };
}
