import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useThemeColors, layout, radius } from '@/theme';

/** Raised card per 07 §5: surfaceRaised + hairline separator, no shadow. */
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.separator },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    padding: layout.cardPadding,
  },
});
