import type { Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';

import { useThemeColors, fonts, radius, spacing } from '@/theme';

/**
 * - `primary`: filled lapis capsule, the one main action of a screen or card (07 §6).
 * - `secondary`: lapis outline and label, an alternative beside or under a primary.
 * - `tinted`: `lapisWash` capsule with an ink label, a quieter filled action.
 * - `plain`: label only, in lapis; still a full 44pt target.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** `destructive` draws the label (or a primary's fill) in the error colour. */
  role?: 'default' | 'destructive';
  /** `small` is the 15pt in-card size; both are at least 44pt tall. @default 'large' */
  size?: 'large' | 'small';
  disabled?: boolean;
  /** Work in flight: a spinner replaces the label and presses are ignored. */
  busy?: boolean;
  /** Spoken label when it differs from the visible one. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /** Cap on Dynamic Type growth, for bars that cannot wrap. */
  maxFontSizeMultiplier?: number;
  /** Outer layout only (margins, flex, alignSelf). The look belongs to the variant. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ViewInstance>;
};

/** Minimum touch target on both axes (HIG). */
export const MIN_TOUCH_TARGET = 44;

/**
 * The app's button. One Pressable rather than a hosted SwiftUI button, so it
 * sizes like any other React Native view in flex rows and fold-aware panes,
 * carries a spoken label and hint, and draws its label in `onLapis`, which a
 * system prominent button would not.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  role = 'default',
  size = 'large',
  disabled = false,
  busy = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  maxFontSizeMultiplier,
  style,
  ref,
}: ButtonProps) {
  const colors = useThemeColors();
  const accent = role === 'destructive' ? colors.error : colors.lapis;
  const inactive = disabled || busy;

  const labelColor =
    variant === 'primary'
      ? colors.onLapis
      : variant === 'tinted' && role === 'default'
        ? // Lapis on its own wash is only 4.1:1 in dark mode.
          colors.ink
        : accent;
  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: accent }
      : variant === 'tinted'
        ? { backgroundColor: colors.lapisWash }
        : variant === 'secondary'
          ? { borderWidth: 1.5, borderColor: accent }
          : {};

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (busy ? label : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.large,
        surface,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          style={[
            size === 'small' ? styles.smallLabel : styles.largeLabel,
            { color: labelColor, fontFamily: fonts?.ui },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  // Centred: a long label ("Continue 1 Thessalonians 5:16–18") wraps at large text.
  largeLabel: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  smallLabel: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
});
