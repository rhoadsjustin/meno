import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';

import type { ReservedRegionsViewProps } from './ReservedRegions.types';

/** The native observer view. iOS only; callers gate on `Platform.OS`. */
export const ReservedRegionsNativeView: ComponentType<ReservedRegionsViewProps> =
  requireNativeView('ReservedRegions');
