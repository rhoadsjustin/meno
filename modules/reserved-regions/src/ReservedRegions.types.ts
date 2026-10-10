import type { StyleProp, ViewStyle } from 'react-native';

/** A rectangle in points, relative to the observer view (the app window). */
export type RegionRect = { x: number; y: number; width: number; height: number };

/**
 * One reserved region reported by UIKit (iOS 27.1+). `division` is the
 * folding region of a partially folded iPhone Duo; `occlusion` is hardware
 * the content must avoid, such as a front camera. Frames already include
 * the system's margins for interactive content.
 */
export type ReservedRegion = RegionRect & {
  kind: 'division' | 'occlusion';
  active: boolean;
};

export type RegionsChangeEvent = { regions: ReservedRegion[] };

export type ReservedRegionsViewProps = {
  onRegionsChange?: (event: { nativeEvent: RegionsChangeEvent }) => void;
  style?: StyleProp<ViewStyle>;
};
