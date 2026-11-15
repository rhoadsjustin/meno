/**
 * The Reader's text size (docs/07 §4): 22/34 by default, adjustable from 18
 * to 28. Pure: the scale is handed in (`scriptureType` from the theme), and
 * the stored value lives in `reader-prefs.ts`.
 */
export type TextScale = {
  defaultSize: number;
  defaultLineHeight: number;
  minSize: number;
  maxSize: number;
};

export const TEXT_SIZE_STEP = 2;

/** A stored or stepped size brought onto the scale; anything unusable is the default. */
export function clampTextSize(size: number, scale: TextScale): number {
  if (!Number.isFinite(size)) return scale.defaultSize;
  return Math.min(scale.maxSize, Math.max(scale.minSize, Math.round(size)));
}

/** One step smaller (-1) or larger (1), stopping at the ends of the scale. */
export function stepTextSize(size: number, direction: 1 | -1, scale: TextScale): number {
  return clampTextSize(clampTextSize(size, scale) + direction * TEXT_SIZE_STEP, scale);
}

/** The font size and line height for Scripture at `size`: the default's 34/22 proportion. */
export function readerType(
  size: number,
  scale: TextScale,
): { fontSize: number; lineHeight: number } {
  return {
    fontSize: size,
    lineHeight: Math.round((size * scale.defaultLineHeight) / scale.defaultSize),
  };
}
