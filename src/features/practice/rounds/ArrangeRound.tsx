/**
 * Arrange (tier 4): shuffled phrase tiles tapped into order (docs/03 §1).
 */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildArrangeRound, gradeArrangement } from '@/services/practice';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

export function ArrangeRound({
  text,
  chunkId,
  attemptNo,
  onDone,
}: {
  text: string;
  chunkId: string;
  attemptNo: number;
  onDone: (outcome: { accuracy: number; missedWords: string[] }) => void;
}) {
  const colors = useThemeColors();
  const round = useMemo(
    () => buildArrangeRound(text, chunkId, attemptNo),
    [text, chunkId, attemptNo]
  );
  const [placed, setPlaced] = useState<number[]>([]);

  const remaining = round.shuffledOrder.filter((i) => !placed.includes(i));

  const place = (tile: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaced([...placed, tile]);
  };
  const unplace = (position: number) => {
    setPlaced(placed.filter((_, i) => i !== position));
  };

  const submit = () => {
    const accuracy = gradeArrangement(round, placed);
    onDone({
      accuracy,
      missedWords: placed.filter((tile, i) => tile !== i).map((tile) => round.phrases[tile]),
    });
  };

  return (
    <>
      <View style={[styles.answerArea, { borderColor: colors.separator }]}>
        {placed.length === 0 && (
          <Text style={[styles.placeholder, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Tap the phrases in order
          </Text>
        )}
        {placed.map((tile, i) => (
          <Pressable
            key={`${tile}-${i}`}
            accessibilityLabel={`Placed phrase: ${round.phrases[tile]}. Tap to remove.`}
            onPress={() => unplace(i)}
            style={[styles.tile, { backgroundColor: colors.lapisWash, borderColor: colors.lapis }]}>
            <Text style={[styles.tileText, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {round.phrases[tile]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bank}>
        {remaining.map((tile) => (
          <Pressable
            key={tile}
            accessibilityRole="button"
            accessibilityLabel={`Phrase: ${round.phrases[tile]}`}
            onPress={() => place(tile)}
            style={[styles.tile, { backgroundColor: colors.surfaceRaised, borderColor: colors.separator }]}>
            <Text style={[styles.tileText, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {round.phrases[tile]}
            </Text>
          </Pressable>
        ))}
      </View>

      {remaining.length === 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={[styles.button, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Check order</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  answerArea: {
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.md,
    gap: spacing.sm,
  },
  placeholder: { fontSize: 15 },
  bank: { gap: spacing.sm, marginTop: spacing.xl },
  tile: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tileText: { fontSize: 17, lineHeight: 24 },
  button: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
