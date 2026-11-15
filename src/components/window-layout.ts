import { breakpoints as layout } from '@/theme/breakpoints';

/**
 * What a window's size alone says about its layout. Pure, so the iPhone Duo
 * poses can be unit-tested; `useContentLayout` adds insets and the fold.
 *
 * - `isWide`: the window is past a phone's width. Use it to lift column
 *   caps and bleeds, not to split the screen.
 * - `twoPane`: the one test for laying two panes side by side — wide AND
 *   wider than tall. iPhone Duo opened and rotated is 669×951: wide, but
 *   two panes there are ~300pt each, narrower than the cover panel, and the
 *   crease runs across both where FoldAwareRow cannot keep them clear.
 * - `isExtraWide`: room for a fixed rail beside a full reading column.
 * - `short`: short on height whatever the width (iPhone Duo's cover panel
 *   and its opened landscape pose); keep the actions on screen.
 */
export function windowLayout(width: number, height: number) {
  const isWide = width >= layout.wideBreakpoint;
  return {
    isWide,
    twoPane: isWide && width > height,
    isExtraWide: width >= layout.extraWideBreakpoint,
    short: height < layout.shortHeight,
  };
}
