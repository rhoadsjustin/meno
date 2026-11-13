/**
 * Window-size breakpoints, in points. Pure data (no React Native import) so
 * `components/window-layout.ts` can be unit-tested; read them through
 * `layout` in tokens.ts everywhere else.
 */
export const breakpoints = {
  /** Where a window stops being "a phone". */
  wideBreakpoint: 600,
  /** Room for a fixed rail beside a full reading column (iPhone Duo opened
   * in its landscape pose, iPad); below this the rail would squeeze the
   * practice rounds into a phone-width column. */
  extraWideBreakpoint: 900,
  /** Below this a window is short on height whatever its width: iPhone Duo
   * is 669pt high opened in its landscape pose and 678pt on the cover panel.
   * Screens that stack a result above their actions tighten up here. */
  shortHeight: 720,
} as const;
