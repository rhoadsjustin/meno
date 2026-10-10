/**
 * A two-page spread with UIKit's page curl (UIPageViewController, spine in
 * the middle): the sheet bends from wherever it is grabbed and follows the
 * finger across the spine, and a tap near an outer edge turns that page.
 *
 *   <PageCurlView current={2} spreadKey="John:1:0" onTurn={…}>
 *     {previousLeft}{previousRight}{left}{right}{nextLeft}{nextRight}
 *   </PageCurlView>
 *
 * Children are pages in reading order, two to a spread, each laid out at the
 * origin at half the view's width; `current` is the index of the current
 * left page. iOS only: `PageCurlView` is null elsewhere, and callers fall
 * back to their own page change.
 */
import { requireNativeView } from 'expo';
import type { ComponentType, ReactNode } from 'react';
import { Platform, type ViewProps } from 'react-native';

export type PageCurlViewProps = ViewProps & {
  /** Index, among the children, of the current spread's left page. */
  current: number;
  /** Names the current spread; changes whenever React moves to another. */
  spreadKey: string;
  /** A turn finished: `delta` spreads forward (positive) or back. */
  onTurn: (event: { nativeEvent: { delta: number } }) => void;
  children: ReactNode;
};

function load(): ComponentType<PageCurlViewProps> | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeView('PageCurl');
  } catch {
    return null;
  }
}

export const PageCurlView = load();
