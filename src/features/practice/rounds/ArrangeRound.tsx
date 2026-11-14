/**
 * Arrange (tier 4): shuffled phrase tiles tapped into order (docs/03 §1).
 */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, MIN_TOUCH_TARGET } from '@/components/button';
import { useTranslation } from '@/i18n/react';
import { buildArrangeRound, gradeArrangement, isPlacementCorrect } from '@/services/practice';
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
  onDone: (outcome: { accuracy: number; unitCount: number; missedWords: string[] }) => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation('practice');
  const round = useMemo(
    () => buildArrangeRound(text, chunkId, attemptNo),
    [text, chunkId, attemptNo]
  );
  const [placed, setPlaced] = useState<number[]>([]);

  const remaining = round.shuffledOrder.filter((i) => !placed.includes(i));

  const place = (tile: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaced([...placed, tile]);
    // VoiceOver: the focused tile leaves the bank, so say where it went.
    const said: string[] = [
      t('arrange.placed', { position: placed.length + 1, phrase: round.phrases[tile] }),
    ];
    if (remaining.length === 1) said.push(t('arrange.allPlaced'));
    AccessibilityInfo.announceForAccessibility(said.join(' '));
  };
  const unplace = (position: number) => {
    AccessibilityInfo.announceForAccessibility(
      t('arrange.removed', { phrase: round.phrases[placed[position]] }),
    );
    setPlaced(placed.filter((_, i) => i !== position));
  };

  const submit = () => {
    const accuracy = gradeArrangement(round, placed);
    onDone({
      accuracy,
      unitCount: round.phrases.length,
      missedWords: placed
        .filter((_, i) => !isPlacementCorrect(round, placed, i))
        .map((tile) => round.phrases[tile]),
    });
  };

  return (
    <>
      <View style={[styles.answerArea, { borderColor: colors.separator }]}>
        {placed.length === 0 && (
          <Text style={[styles.placeholder, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('arrange.placeholder')}
          </Text>
        )}
        {placed.map((tile, i) => (
          <Pressable
            key={`${tile}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={t('arrange.placed', { position: i + 1, phrase: round.phrases[tile] })}
            accessibilityHint={t('arrange.placedHint')}
            onPress={() => unplace(i)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.lapisWash, borderColor: colors.lapis },
              pressed && styles.pressed,
            ]}>
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
            accessibilityLabel={t('arrange.phrase', { phrase: round.phrases[tile] })}
            accessibilityHint={t('arrange.phraseHint')}
            onPress={() => place(tile)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.separator },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.tileText, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {round.phrases[tile]}
            </Text>
          </Pressable>
        ))}
      </View>

      {remaining.length === 0 && (
        <Button label={t('arrange.check')} onPress={submit} style={styles.button} />
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
    // A full touch target without more padding: the round is already long
    // on a short window.
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.6 },
  tileText: { fontSize: 17, lineHeight: 24 },
  button: { marginTop: spacing.xxl },
});
