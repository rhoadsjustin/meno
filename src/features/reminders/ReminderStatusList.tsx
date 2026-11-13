import { StyleSheet, Text, View } from 'react-native';

import { Symbol } from '@/components/symbol';
import { useTranslation } from '@/i18n/react';
import { describeReminders, type ReminderStatus } from '@/services/notifications';
import { useThemeColors, fonts, spacing, textStyle } from '@/theme';

/**
 * One line per kind of reminder: when the next one comes, or why none will
 * (services/notifications/status), under the switch in Settings. Status is
 * words plus a mark, never color alone.
 */
export function ReminderStatusList({ status }: { status: ReminderStatus }) {
  const colors = useThemeColors();
  const { t } = useTranslation('notifications');
  const lines = describeReminders(status, { now: new Date() });
  return (
    <View style={styles.list}>
      {lines.map((line) => {
        const markColor =
          // Lapis, not `success`: 07 §3 keeps that for grading.
          line.tone === 'ok'
            ? colors.lapis
            : line.tone === 'problem'
              ? colors.error
              : colors.inkFaint;
        return (
          <View
            key={line.kind}
            accessible
            accessibilityLabel={t('status.lineLabel', { title: line.title, detail: line.detail })}
            style={styles.line}>
            <View style={styles.mark}>
              {line.tone === 'ok' ? (
                <Symbol ios="checkmark.circle.fill" android="check_circle" size={15} color={markColor} />
              ) : line.tone === 'problem' ? (
                <Symbol
                  ios="exclamationmark.circle.fill"
                  android="error"
                  size={15}
                  color={markColor}
                />
              ) : (
                <Symbol ios="minus.circle" android="do_not_disturb_on" size={15} color={markColor} />
              )}
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {line.title}
              </Text>
              <Text
                style={[
                  styles.detail,
                  {
                    color: line.tone === 'problem' ? colors.error : colors.inkFaint,
                    fontFamily: fonts?.ui,
                  },
                ]}>
                {line.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  line: { flexDirection: 'row', gap: spacing.sm },
  // Centred on the title's first line.
  mark: { paddingTop: 2 },
  text: { flex: 1, gap: 2 },
  title: { ...textStyle.subheadline, fontWeight: '600' },
  detail: { ...textStyle.footnote },
});
