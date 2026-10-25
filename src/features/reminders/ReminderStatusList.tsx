import { StyleSheet, Text, View } from 'react-native';

import { describeReminders, type ReminderStatus } from '@/services/notifications';
import { useThemeColors, fonts, spacing } from '@/theme';

/**
 * One line per kind of reminder: when the next one comes, or why none will
 * (services/notifications/status). Shared by Settings and the setup guide
 * so the two can never disagree. Status is words plus a mark, never color
 * alone.
 */
export function ReminderStatusList({ status }: { status: ReminderStatus }) {
  const colors = useThemeColors();
  const lines = describeReminders(status, { now: new Date() });
  return (
    <View style={styles.list}>
      {lines.map((line) => {
        const mark = line.tone === 'ok' ? '✓' : line.tone === 'problem' ? '!' : '–';
        const markColor =
          line.tone === 'ok'
            ? colors.success
            : line.tone === 'problem'
              ? colors.error
              : colors.inkFaint;
        return (
          <View
            key={line.kind}
            accessible
            accessibilityLabel={`${line.title}. ${line.detail}`}
            style={styles.line}>
            <Text
              style={[styles.mark, { color: markColor, fontFamily: fonts?.ui }]}
              importantForAccessibility="no"
              accessibilityElementsHidden>
              {mark}
            </Text>
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
  mark: { fontSize: 15, lineHeight: 20, fontWeight: '700', minWidth: 14, textAlign: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  detail: { fontSize: 14, lineHeight: 19 },
});
