import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Button } from '@/components/button';
import { t } from '@/i18n';
import { useThemeColors, fonts, spacing } from '@/theme';

export type UnavailableAction = {
  label: string;
  onPress: () => void;
  /** Spoken label when it differs from the visible one. */
  accessibilityLabel?: string;
  busy?: boolean;
  testID?: string;
};

export type UnavailableProps = {
  /**
   * - `empty`: there is nothing here yet, and that is not a fault. A quiet
   *   symbol (or none) and a header title.
   * - `failed`: something could not be loaded or done. A warning symbol in
   *   the error colour, and the title and message are spoken as they appear.
   */
  kind: 'empty' | 'failed';
  title: string;
  message?: string;
  /** The way forward: Try again for a failure, the next step for an empty state. */
  action?: UnavailableAction;
  /** A quieter alternative under the action (Done, Use the WEB instead). */
  secondaryAction?: UnavailableAction;
  /** Overrides the symbol; `failed` defaults to a warning triangle, `empty` to none. */
  symbol?: { ios: SFSymbol; android: AndroidSymbol };
  /** `scripture` sets the title in New York, for the recap's display voice. @default 'ui' */
  titleFont?: 'ui' | 'scripture';
  /**
   * `fill` centres the state in the space it is given (a whole screen or
   * pane); `inline` sizes to its content, for use inside a list or a card.
   * @default 'inline'
   */
  layout?: 'fill' | 'inline';
  testID?: string;
  /** Outer layout only (margins, padding). */
  style?: StyleProp<ViewStyle>;
};

const WARNING = { ios: 'exclamationmark.triangle', android: 'warning' } as const;

/**
 * The one "nothing to show" state (07 §6): a symbol, a title, a sentence and
 * at most two actions, centred. Used wherever a screen has no content, so a
 * failed load never looks like an empty shelf, a blank page or a spinner
 * that never ends.
 *
 * Empty and failed differ by symbol and wording, never by colour alone. A
 * failure is announced to VoiceOver when it appears: React Native's `alert`
 * role and live regions do not speak on iOS by themselves.
 *
 * Plain React Native rather than SwiftUI's ContentUnavailableView, so it
 * keeps the app's Button, sizes like any other view inside lists, cards and
 * fold-aware panes, and is the same on Android.
 */
export function Unavailable({
  kind,
  title,
  message,
  action,
  secondaryAction,
  symbol,
  titleFont = 'ui',
  layout = 'inline',
  testID,
  style,
}: UnavailableProps) {
  const colors = useThemeColors();
  const failed = kind === 'failed';
  const glyph = symbol ?? (failed ? WARNING : null);

  // iOS only: Android's live region on the title already speaks, and
  // announcing there as well would say it twice.
  useEffect(() => {
    if (!failed || Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibility(message ? `${title}. ${message}` : title);
  }, [failed, title, message]);

  return (
    <View testID={testID} style={[styles.root, layout === 'fill' && styles.fill, style]}>
      {glyph && (
        <View
          // Decorative: the title says what happened.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.symbol}>
          <SymbolView
            name={{ ios: glyph.ios, android: glyph.android, web: glyph.android }}
            tintColor={failed ? colors.error : colors.inkFaint}
            size={36}
          />
        </View>
      )}
      <Text
        accessibilityRole={failed ? 'alert' : 'header'}
        accessibilityLiveRegion={failed ? 'assertive' : 'none'}
        style={[
          titleFont === 'scripture' ? styles.displayTitle : styles.title,
          {
            color: colors.ink,
            fontFamily: titleFont === 'scripture' ? fonts?.scripture : fonts?.ui,
          },
        ]}>
        {title}
      </Text>
      {!!message && (
        <Text style={[styles.message, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {message}
        </Text>
      )}
      {(action || secondaryAction) && (
        <View style={styles.actions}>
          {action && (
            <Button
              label={action.label}
              accessibilityLabel={action.accessibilityLabel}
              busy={action.busy}
              onPress={action.onPress}
              testID={action.testID}
              style={styles.action}
            />
          )}
          {secondaryAction && (
            <Button
              variant="plain"
              label={secondaryAction.label}
              accessibilityLabel={secondaryAction.accessibilityLabel}
              busy={secondaryAction.busy}
              onPress={secondaryAction.onPress}
              testID={secondaryAction.testID}
              style={styles.action}
            />
          )}
        </View>
      )}
    </View>
  );
}

/** How long a load may take before the spinner shows: bundled text and local
 * reads finish well inside it, so they never flash one. */
const SPINNER_DELAY_MS = 400;

/**
 * A load in flight: nothing for a moment, then a labelled spinner, so a
 * local read does not flash one and a network read is never a blank screen.
 */
export function LoadingState({
  label,
  layout = 'fill',
  style,
}: {
  /** What VoiceOver reads; "Loading…" by default. */
  label?: string;
  layout?: 'fill' | 'inline';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View
      accessible={shown}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common:loading')}
      style={[styles.root, layout === 'fill' && styles.fill, style]}>
      {shown && <ActivityIndicator color={colors.inkFaint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  fill: { flex: 1, justifyContent: 'center' },
  symbol: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  displayTitle: { fontSize: 26, fontWeight: '600', textAlign: 'center' },
  message: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  // Stretched within a cap: a full-width capsule on a phone, not on a wide pane.
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  action: { width: '100%', maxWidth: 360 },
});
