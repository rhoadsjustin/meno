import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH_TARGET } from '@/components/button';
import { SymbolIcon } from '@/components/symbol';
import { useThemeColors, fonts } from '@/theme';

export type TextLinkProps = {
  label: string;
  onPress?: () => void;
  /** `link` for navigation that reads as a link, `button` for an action. @default 'button' */
  accessibilityRole?: 'button' | 'link';
  /** `accent` is lapis, `quiet` is inkFaint, `destructive` is the error colour. @default 'accent' */
  tone?: 'accent' | 'quiet' | 'destructive';
  /** `large` is 17pt, for a text button in a row of system controls. @default 'regular' */
  size?: 'regular' | 'large';
  /** @default 'regular' */
  weight?: 'regular' | 'semibold';
  /**
   * The link opens another screen: on iOS it ends in a disclosure chevron.
   * Material rows carry no chevron, so Android leaves it off.
   */
  disclosure?: boolean;
  disabled?: boolean;
  /** Work in flight: presses are ignored and VoiceOver reads it as busy. */
  busy?: boolean;
  /** Spoken label when it differs from the visible one. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  maxFontSizeMultiplier?: number;
  /** Outer layout only (margins, alignSelf). */
  style?: StyleProp<ViewStyle>;
  /** Text alignment and padding for the label; colour and size belong to the link. */
  labelStyle?: StyleProp<TextStyle>;
};

/**
 * A text action: a quiet link under a card or a caption-weight choice.
 * The label is one line of text, so the Pressable supplies the 44pt target
 * and the pressed state.
 */
export function TextLink({
  label,
  onPress,
  accessibilityRole = 'button',
  tone = 'accent',
  size = 'regular',
  weight = 'regular',
  disclosure = false,
  disabled = false,
  busy = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  maxFontSizeMultiplier,
  style,
  labelStyle,
}: TextLinkProps) {
  const colors = useThemeColors();
  const inactive = disabled || busy;
  const chevron = disclosure && Platform.OS === 'ios';
  const color =
    tone === 'destructive' ? colors.error : tone === 'quiet' ? colors.inkFaint : colors.lapis;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.target,
        chevron && styles.row,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[
          size === 'large' ? styles.largeLabel : styles.label,
          weight === 'semibold' && styles.semibold,
          chevron && styles.shrink,
          { color, fontFamily: fonts?.ui },
          labelStyle,
        ]}>
        {label}
      </Text>
      {chevron && (
        <SymbolIcon
          ios="chevron.right"
          android="chevron_right"
          size={13}
          weight="semibold"
          color={colors.inkFaint}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  label: { fontSize: 15 },
  largeLabel: { fontSize: 17 },
  semibold: { fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  shrink: { flexShrink: 1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.5 },
});
