import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { layout, spacing, useThemeColors } from '@/theme';

/**
 * A screen's actions, pinned under its scroll view so they stay on screen
 * however long the content above is — a marked passage on a result screen,
 * on a short window most of all (iPhone Duo opened is 669pt high). Render it
 * as the last child of a column whose scroll view has `flex: 1`, and only in
 * phases without a text field: it does not move for the keyboard.
 *
 * The screen applies the side insets; this clears the bottom one and keeps
 * the actions in the reading column the content uses.
 */
export function ActionFooter({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const { insets } = useContentLayout();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}>
      <View style={[contentColumn, styles.column]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: layout.screenMargin,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  column: { gap: spacing.sm },
});
