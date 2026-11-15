import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { contentColumn, contentColumnWide, useContentLayout } from '@/components/content-layout';
import { useThemeColors, fonts, layout, spacing, textStyle } from '@/theme';

/**
 * Tab-screen scaffold: surface background, safe-area top, iOS-style large
 * title. (Native large-title headers arrive with per-tab stacks in M2.)
 * `wide` lifts the column cap for screens that lay out two panes on wide
 * windows (iPhone Duo opened, Split View, iPad-class sizes).
 *
 * `panes` hands scrolling to the panes inside (`FoldAwareRow`'s `scroll`):
 * the page stops scrolling, the title stays put and the content fills the
 * window's height. It is the same scroll view either way, so a screen can
 * pass its two-pane flag and nothing remounts when the window changes.
 */
export function Screen({
  title,
  accessory,
  wide = false,
  panes = false,
  children,
}: PropsWithChildren<{
  title: string;
  accessory?: React.ReactNode;
  wide?: boolean;
  panes?: boolean;
}>) {
  const colors = useThemeColors();
  const { insets, sides } = useContentLayout();
  // A page scrolled partway down has nowhere to be once it stops scrolling.
  const scroller = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (panes) scroller.current?.scrollTo({ y: 0, animated: false });
  }, [panes]);
  // The scroll view's own height: its content is given exactly that much, so
  // the panes inside are bounded and scroll. (`flex: 1` on the content only
  // sets a minimum; taller content still grows past it.)
  const [viewport, setViewport] = useState(0);

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScrollView
        ref={scroller}
        scrollEnabled={!panes}
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        contentContainerStyle={[
          styles.content,
          wide ? contentColumnWide : contentColumn,
          { paddingTop: insets.top + spacing.sm },
          panes && viewport > 0 && { height: viewport, paddingBottom: 0 },
        ]}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            style={[styles.largeTitle, { color: colors.ink, fontFamily: fonts?.ui }]}
            allowFontScaling
            maxFontSizeMultiplier={1.6}>
            {title}
          </Text>
          {accessory}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenMargin,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  largeTitle: {
    ...textStyle.largeTitle,
    fontWeight: '700',
  },
});
