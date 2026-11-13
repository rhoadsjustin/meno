/**
 * The grouped settings list (HIG: Settings-style lists): a section is an
 * optional header, one raised group of rows split by inset hairlines, and an
 * optional footnote that explains the group. A row is a label with an
 * optional value, a line of detail, a disclosure mark and a trailing control.
 *
 * Built from React Native views rather than a SwiftUI Form: the list lives
 * inside the tab's scroll view and beside the guide on wide windows, where
 * `FoldAwareRow` sizes both panes. The controls in the rows are the system's
 * own (the switch, the time picker).
 */
import { Children, type PropsWithChildren, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
} from 'react-native';

import { MIN_TOUCH_TARGET } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeader } from '@/components/section-header';
import { Symbol } from '@/components/symbol';
import { useThemeColors, fonts, layout, spacing, textStyle } from '@/theme';

export type SettingsSectionProps = PropsWithChildren<{
  /** The small label over the group; a VoiceOver heading. */
  title?: string;
  /** Footnotes under the group, one paragraph each. */
  footer?: string | string[];
}>;

export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const colors = useThemeColors();
  const rows = Children.toArray(children);
  const notes = footer == null ? [] : Array.isArray(footer) ? footer : [footer];
  return (
    <View style={styles.section}>
      {title != null && <SectionHeader title={title} style={styles.inset} />}
      <Card style={styles.group}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
            {row}
          </View>
        ))}
      </Card>
      {notes.map((note) => (
        <Text
          key={note}
          style={[styles.footer, styles.inset, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {note}
        </Text>
      ))}
    </View>
  );
}

export type SettingsRowProps = {
  label: string;
  /** The current setting, trailing the label; wraps under it when they don't fit. */
  value?: string;
  /** A quieter line under the label. */
  detail?: string;
  /** Makes the label side of the row a button (or a link). */
  onPress?: () => void;
  /** @default 'button' */
  accessibilityRole?: 'button' | 'link';
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  /**
   * Hides the label side from VoiceOver, for a row whose trailing control
   * carries the same label itself (a switch).
   */
  labelHidden?: boolean;
  /**
   * `chevron`: the row opens another screen (iOS only; Material rows carry
   * none). `external`: the row leaves the app for the browser.
   */
  disclosure?: 'chevron' | 'external';
  /** `accent` and `destructive` are actions; `default` is a setting. @default 'default' */
  tone?: 'default' | 'accent' | 'destructive';
  /** The row whose detail shows beside the list on wide windows. */
  selected?: boolean;
  /** A control on the trailing edge, outside the label's press target. */
  trailing?: ReactNode;
  testID?: string;
};

export function SettingsRow({
  label,
  value,
  detail,
  onPress,
  accessibilityRole = 'button',
  accessibilityHint,
  accessibilityState,
  labelHidden = false,
  disclosure,
  tone = 'default',
  selected = false,
  trailing,
  testID,
}: SettingsRowProps) {
  const colors = useThemeColors();
  const labelColor =
    tone === 'destructive' ? colors.error : tone === 'accent' ? colors.lapis : colors.ink;
  // On the selection wash inkFaint falls under 4.5:1, so the quieter text
  // steps up to ink there; the wash is the cue.
  const quiet = selected ? colors.ink : colors.inkFaint;
  const mark =
    disclosure === 'external' ? (
      <Symbol ios="arrow.up.right" android="open_in_new" size={13} weight="semibold" color={quiet} />
    ) : disclosure === 'chevron' && Platform.OS === 'ios' ? (
      <Symbol ios="chevron.right" android="chevron_right" size={13} weight="semibold" color={quiet} />
    ) : null;

  const content = (
    <>
      <View style={styles.text}>
        <View style={styles.line}>
          <Text style={[styles.label, { color: labelColor, fontFamily: fonts?.ui }]}>{label}</Text>
          {value != null && (
            <Text style={[styles.value, { color: quiet, fontFamily: fonts?.ui }]}>{value}</Text>
          )}
        </View>
        {detail != null && (
          <Text style={[styles.detail, { color: quiet, fontFamily: fonts?.ui }]}>{detail}</Text>
        )}
      </View>
      {mark}
    </>
  );
  const body = [styles.body, trailing != null && styles.bodyBeforeTrailing];
  const hidden = labelHidden
    ? ({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      } as const)
    : null;

  return (
    <View style={[styles.row, selected && { backgroundColor: colors.lapisWash }]}>
      {onPress ? (
        <Pressable
          accessibilityRole={accessibilityRole}
          accessibilityHint={accessibilityHint}
          accessibilityState={accessibilityState}
          onPress={onPress}
          testID={testID}
          style={({ pressed }) => [body, pressed && styles.pressed]}
          {...hidden}>
          {content}
        </Pressable>
      ) : (
        // One element, so VoiceOver reads "Version, 1.7.0" in one stop.
        <View accessible={!labelHidden} testID={testID} style={body} {...hidden}>
          {content}
        </View>
      )}
      {trailing != null && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

/** Free content in a group (a status list), on the rows' margins. */
export function SettingsBlock({ children }: PropsWithChildren) {
  return <View style={styles.block}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  inset: { paddingHorizontal: layout.cardPadding },
  // Rows run edge to edge so the selection wash and the press target do too.
  group: { padding: 0, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: layout.cardPadding },
  footer: { ...textStyle.footnote },
  row: { flexDirection: 'row', alignItems: 'center' },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: layout.cardPadding,
  },
  bodyBeforeTrailing: { paddingRight: spacing.md },
  trailing: { paddingRight: layout.cardPadding },
  text: { flex: 1, gap: 2 },
  // The value drops under the label when the two don't fit on one line
  // (long values, accessibility text sizes).
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: 2,
  },
  label: { ...textStyle.body, flexShrink: 1 },
  value: { ...textStyle.body, flexShrink: 1 },
  detail: { ...textStyle.subheadline },
  block: { paddingVertical: spacing.md, paddingHorizontal: layout.cardPadding },
  pressed: { opacity: 0.5 },
});
