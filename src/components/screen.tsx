import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors, fonts, layout, spacing } from '@/theme';

/**
 * Tab-screen scaffold: surface background, safe-area top, iOS-style large
 * title. (Native large-title headers arrive with per-tab stacks in M2.)
 */
export function Screen({
  title,
  accessory,
  children,
}: PropsWithChildren<{ title: string; accessory?: React.ReactNode }>) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
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
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
});
