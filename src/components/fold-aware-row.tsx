import { useCallback, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useReservedRegions } from '@modules/reserved-regions';
import { spacing } from '@/theme';

/**
 * Two panes side by side that stay clear of iPhone Duo's folding region.
 *
 * Flat (or on any other device) this is an even split with a normal gap,
 * matching Apple's advice to prefer an even number of columns. When the
 * device is partially folded and the fold runs vertically through the row,
 * the panes resize so the gutter is exactly the reserved folding region:
 * nothing interactive sits on the crease, and the layout changes as little
 * as possible (HIG: "move only what's necessary").
 */
export function FoldAwareRow({
  children,
  fill = false,
  style,
}: {
  /** Exactly two panes. */
  children: [ReactNode, ReactNode];
  /** Fill the parent's height and stretch the panes (for scrolling panes). */
  fill?: boolean;
  style?: object;
}) {
  const { fold } = useReservedRegions();
  const ref = useRef<View>(null);
  const [frame, setFrame] = useState<{ x: number; width: number } | null>(null);

  // Window position of the row, so the fold (window coordinates) can be
  // mapped onto it. measureInWindow is async; layout changes re-measure.
  const onLayout = useCallback((_: LayoutChangeEvent) => {
    ref.current?.measureInWindow((x, _y, width) => setFrame({ x, width }));
  }, []);

  const vertical =
    fold &&
    frame &&
    fold.height > fold.width &&
    fold.x > frame.x &&
    fold.x + fold.width < frame.x + frame.width;
  const [left, right] = children;

  if (vertical) {
    const leftWidth = Math.max(0, fold.x - frame.x - spacing.md);
    const rightWidth = Math.max(0, frame.x + frame.width - (fold.x + fold.width) - spacing.md);
    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={[styles.row, styles.folded, fill && styles.fill, style]}>
        <View style={[styles.pane, { width: leftWidth }]}>{left}</View>
        <View style={[styles.pane, { width: rightWidth }]}>{right}</View>
      </View>
    );
  }
  return (
    <View ref={ref} onLayout={onLayout} style={[styles.row, fill && styles.fill, style]}>
      <View style={[styles.pane, styles.half]}>{left}</View>
      <View style={[styles.pane, styles.half]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  fill: { flex: 1, alignItems: 'stretch' },
  folded: { justifyContent: 'space-between', gap: 0 },
  pane: { gap: spacing.lg },
  half: { flex: 1 },
});
