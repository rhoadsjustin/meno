import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/components/button';
import { Symbol } from '@/components/symbol';
import { useThemeColors, fonts, spacing, textStyle } from '@/theme';

export type NavRowProps = {
  title: string;
  /** One quiet line under the title: what is behind the row. */
  detail?: string;
  onPress: () => void;
  /** Spoken label when it differs from "title. detail". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /** Outer layout only (margins, flex). */
  style?: StyleProp<ViewStyle>;
};

/**
 * A row that opens another screen: title, one line of detail and a
 * disclosure chevron, the whole row one target of at least 44pt that dims
 * while pressed. The one look for "this card navigates" (07 §6), so a row is
 * never mistaken for a card with a link inside it. Put it in a `Card`.
 *
 * The chevron follows `TextLink`'s rule (07 §7): iOS draws it, Material rows
 * carry none.
 */
export function NavRow({
  title,
  detail,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: NavRowProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${title}. ${detail}` : title)}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>{title}</Text>
        {!!detail && (
          <Text style={[styles.detail, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {detail}
          </Text>
        )}
      </View>
      {Platform.OS === 'ios' && (
        <Symbol
          ios="chevron.right"
          android="chevron_right"
          size={14}
          weight="semibold"
          color={colors.inkFaint}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: { flex: 1, gap: spacing.xs },
  title: textStyle.headline,
  detail: textStyle.subheadline,
  pressed: { opacity: 0.6 },
});
