/**
 * Reserved display regions for iPhone Duo (Apple HIG "Designing for iPhone
 * Duo" → Reserved regions). UIKit exposes them per view on iOS 27.1+; this
 * module hosts an invisible observer view at the app root and republishes
 * the regions to React as plain rects, so layouts can keep content clear of
 * the folding region and the cameras.
 *
 *   <ReservedRegionsProvider>…app…</ReservedRegionsProvider>
 *   const { fold, occlusions } = useReservedRegions();
 *
 * On Android, older iOS, and devices without a hinge the provider is inert
 * and `fold` is null, so consumers need no platform checks.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { RegionRect, ReservedRegion, RegionsChangeEvent } from './src/ReservedRegions.types';

export type { RegionRect, ReservedRegion } from './src/ReservedRegions.types';

export type ReservedRegions = {
  /** The active folding region, in window points, or null when the device is flat or has no hinge. */
  fold: RegionRect | null;
  /** Active hardware occlusions (front cameras), in window points. */
  occlusions: RegionRect[];
  /** Everything UIKit reported, including inactive regions. */
  all: ReservedRegion[];
};

const EMPTY: ReservedRegions = { fold: null, occlusions: [], all: [] };

const Context = createContext<ReservedRegions>(EMPTY);

function toState(regions: ReservedRegion[]): ReservedRegions {
  const active = regions.filter((r) => r.active);
  const fold = active.find((r) => r.kind === 'division') ?? null;
  return {
    fold: fold ? { x: fold.x, y: fold.y, width: fold.width, height: fold.height } : null,
    occlusions: active
      .filter((r) => r.kind === 'occlusion')
      .map(({ x, y, width, height }) => ({ x, y, width, height })),
    all: regions,
  };
}

/** Native observer, resolved lazily so platforms without the module never touch it. */
function loadObserver() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./src/ReservedRegionsView')
      .ReservedRegionsNativeView as typeof import('./src/ReservedRegionsView').ReservedRegionsNativeView;
  } catch {
    return null;
  }
}

const Observer = loadObserver();

/** Hosts the observer view over the app and provides the regions to descendants. */
export function ReservedRegionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReservedRegions>(EMPTY);
  const value = useMemo(() => state, [state]);
  return (
    <Context.Provider value={value}>
      {children}
      {Observer && (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Observer
            style={StyleSheet.absoluteFill}
            onRegionsChange={(e: { nativeEvent: RegionsChangeEvent }) =>
              setState(toState(e.nativeEvent.regions))
            }
          />
        </View>
      )}
    </Context.Provider>
  );
}

/** The current reserved regions; re-renders as the device folds and unfolds. */
export function useReservedRegions(): ReservedRegions {
  return useContext(Context);
}
