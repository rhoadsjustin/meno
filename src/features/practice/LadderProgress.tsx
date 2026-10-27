import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n/react';
import type { LadderProgress as Progress } from '@/services/practice';
import { useThemeColors, fonts, spacing } from '@/theme';

/**
 * How far up the ladder this verse is, as one bar from Read to Speak — a
 * segment per round, so the end is always in sight. `current` rings the
 * round in progress; leave it off on the feedback screen, where the round
 * just finished is already filled in.
 */
export function LadderProgress({ progress, current }: { progress: Progress; current: boolean }) {
  const colors = useThemeColors();
  const { t } = useTranslation('practice');
  const { done, total, pass } = progress;
  const step = Math.min(done + 1, total);
  const caption = current
    ? pass
      ? t('progress.stepPass', { step, total, index: pass.index, of: pass.of })
      : t('progress.step', { step, total })
    : t('progress.done', { done, total });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={caption}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={styles.root}>
      <View style={styles.bar}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < done || (current && i === done) ? colors.lapis : colors.separator,
                opacity: current && i === done ? 0.4 : 1,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, marginBottom: spacing.lg },
  bar: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  caption: { fontSize: 13 },
});
