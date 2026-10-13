import { StyleSheet, Text, View } from 'react-native';

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
  const { done, total, pass } = progress;
  const caption = current
    ? `Step ${Math.min(done + 1, total)} of ${total}${pass ? ` · pass ${pass.index} of ${pass.of}` : ''}`
    : `${done} of ${total} steps done`;

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
