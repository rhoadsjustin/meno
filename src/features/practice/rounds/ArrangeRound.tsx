/**
 * Arrange (tier 4): shuffled phrase tiles tapped into order (docs/03 §1).
 */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, MIN_TOUCH_TARGET } from '@/components/button';
import { useTranslation } from '@/i18n/react';
import {
  arrangedOrder,
  buildArrangeRound,
  gradeArrangement,
  isPlacementCorrect,
  placeTile,
  removeTile,
} from '@/services/practice';
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
  // The answer as slots: taking a phrase back out leaves its place open for
  // the next one tapped, so a slip early on is fixed where it is.
  const [slots, setSlots] = useState<(number | null)[]>([]);

  const remaining = round.shuffledOrder.filter((i) => !slots.includes(i));
  const order = arrangedOrder(round, slots);

  const place = (tile: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = placeTile(slots, tile);
    setSlots(next.slots);
    // VoiceOver: the focused tile leaves the bank, so say where it went.
    const said: string[] = [
      t('arrange.placed', { position: next.position + 1, phrase: round.phrases[tile] }),
    ];
    if (remaining.length === 1) said.push(t('arrange.allPlaced'));
    AccessibilityInfo.announceForAccessibility(said.join(' '));
  };
  const unplace = (position: number) => {
    const tile = slots[position];
    if (tile == null) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility(
      t('arrange.removed', { phrase: round.phrases[tile] }),
    );
    setSlots(removeTile(slots, position));
  };

  const submit = () => {
    if (!order) return;
    const accuracy = gradeArrangement(round, order);
    onDone({
      accuracy,
      unitCount: round.phrases.length,
      missedWords: order
        .filter((_, i) => !isPlacementCorrect(round, order, i))
        .map((tile) => round.phrases[tile]),
    });
  };

  return (
    <>
      <View style={[styles.answerArea, { borderColor: colors.separator }]}>
        {slots.length === 0 && (
          <Text style={[styles.placeholder, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('arrange.placeholder')}
          </Text>
        )}
        {slots.map((tile, i) =>
          tile === null ? (
            // The place a phrase was taken from: the next one tapped goes here.
            <View
              key={`open-${i}`}
              accessible
              accessibilityLabel={t('arrange.openSlot', { position: i + 1 })}
              style={[styles.tile, styles.openSlot, { borderColor: colors.inkFaint }]}
            />
          ) : (
            <Pressable
              key={`${tile}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={t('arrange.placed', {
                position: i + 1,
                phrase: round.phrases[tile],
              })}
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
          ),
        )}
      </View>

      <View style={styles.bank}>
        {remaining.map((tile) => (
          <Pressable
            key={tile}
            accessibilityRole="button"
            accessibilityLabel={t('arrange.phrase', { phrase: round.phrases[tile] })}
            accessibilityHint={t(
              slots.includes(null) ? 'arrange.phraseHintOpen' : 'arrange.phraseHint',
            )}
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

      {/* Always here, as in Type: it says what the round ends on, and it does
          not appear under the finger as the last phrase is placed. */}
      <Button
        label={t('arrange.check')}
        disabled={!order}
        onPress={submit}
        style={styles.button}
      />
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
  openSlot: { borderStyle: 'dashed' },
  pressed: { opacity: 0.6 },
  tileText: { fontSize: 17, lineHeight: 24 },
  button: { marginTop: spacing.xxl },
});
