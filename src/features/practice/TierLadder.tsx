import { StyleSheet, Text, View } from 'react-native';

import { TIERS } from '@/services/practice';
import { useThemeColors, fonts, spacing } from '@/theme';

/**
 * The practice ladder for one chunk (docs/03 §1): Read → First Letters →
 * Blanks → Arrange → Type → Speak. Cleared tiers are filled lapis, the tier
 * being practiced is ringed in lapis, the rest wait in the separator tone.
 * Not gold: a cleared rung is progress, and gold is kept for Memorized.
 * Shown where there is room for context — the Today rail and the practice
 * rail on wide windows.
 */
export function TierLadder({
  highestCleared,
  current,
}: {
  /** The chunk's highest cleared tier; a fresh chunk is -1. */
  highestCleared: number;
  /** The tier of the round in progress, when a session is open. */
  current?: number;
}) {
  const colors = useThemeColors();
  const summary = TIERS.map((t) =>
    t.tier <= highestCleared
      ? `${t.name} cleared`
      : t.tier === current
        ? `${t.name} in progress`
        : `${t.name} ahead`,
  ).join(', ');

  return (
    // One element: read rung by rung, VoiceOver would say the names and
    // drop which are cleared — the dots carry that, and they are silent.
    <View accessible accessibilityLabel={`Ladder: ${summary}`} style={styles.ladder}>
      {TIERS.map((t) => {
        const cleared = t.tier <= highestCleared;
        const active = !cleared && t.tier === current;
        return (
          <View key={t.tier} style={styles.rung}>
            <View
              style={[
                styles.dot,
                cleared
                  ? { backgroundColor: colors.lapis, borderColor: colors.lapis }
                  : active
                    ? { backgroundColor: colors.lapisWash, borderColor: colors.lapis }
                    : { backgroundColor: 'transparent', borderColor: colors.separator },
              ]}
            />
            <Text
              style={[
                styles.name,
                {
                  color: cleared || active ? colors.ink : colors.inkFaint,
                  fontFamily: fonts?.ui,
                  fontWeight: active ? '600' : '400',
                },
              ]}>
              {t.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ladder: { gap: spacing.sm },
  rung: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  name: { fontSize: 15 },
});
