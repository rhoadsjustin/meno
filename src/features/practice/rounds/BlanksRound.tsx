/**
 * Blanks 25/50/75 (docs/03 §1): blanked words as pills inside the text,
 * answered in order from 3-choice chips. Long-press the active blank to
 * reveal it — counted as missed (03 §3 "reveal = miss").
 */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { displayTokens, hashSeed, mulberry32, selectBlanks, shuffle } from '@/services/practice';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

export type BlanksOutcome = {
  accuracy: number;
  missedWords: string[];
};

type BlankState = 'pending' | 'correct' | 'wrong' | 'missed';

export function BlanksRound({
  text,
  density,
  chunkId,
  attemptNo,
  onDone,
}: {
  text: string;
  density: number;
  chunkId: string;
  attemptNo: number;
  onDone: (outcome: BlanksOutcome) => void;
}) {
  const colors = useThemeColors();
  const tokens = useMemo(() => displayTokens(text), [text]);
  const blankIndices = useMemo(
    () => selectBlanks(text, density, chunkId, attemptNo),
    [text, density, chunkId, attemptNo]
  );
  const [states, setStates] = useState<Record<number, BlankState>>(() =>
    Object.fromEntries(blankIndices.map((i) => [i, 'pending']))
  );
  const [cursor, setCursor] = useState(0); // position within blankIndices

  const activeIndex = blankIndices[cursor];

  const choices = useMemo(() => {
    if (activeIndex === undefined) return [];
    const correct = tokens[activeIndex].word;
    const pool = [...new Set(tokens.map((t) => t.word).filter((w) => w.toLowerCase() !== correct.toLowerCase()))];
    const rand = mulberry32(hashSeed(chunkId, 'choices', attemptNo, activeIndex));
    const distractors = shuffle(pool, rand).slice(0, 2);
    return shuffle([correct, ...distractors], rand);
  }, [activeIndex, tokens, chunkId, attemptNo]);

  const settle = (state: BlankState) => {
    const next = { ...states, [activeIndex]: state };
    setStates(next);
    if (state === 'correct') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (cursor + 1 < blankIndices.length) {
      setCursor(cursor + 1);
    } else {
      const values = blankIndices.map((i) => next[i]);
      const correct = values.filter((s) => s === 'correct').length;
      onDone({
        accuracy: blankIndices.length === 0 ? 1 : correct / blankIndices.length,
        missedWords: blankIndices.filter((i) => next[i] !== 'correct').map((i) => tokens[i].word),
      });
    }
  };

  return (
    <>
      <View style={styles.textWrap} accessibilityLabel="Passage with blanks">
        {tokens.map((t, i) => {
          const blankState = states[i];
          if (blankState === undefined) {
            return (
              <Text key={i} style={[styles.word, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                {t.prefix}
                {t.word}
                {t.suffix}{' '}
              </Text>
            );
          }
          const isActive = i === activeIndex;
          const resolved = blankState !== 'pending';
          const pillColor =
            blankState === 'correct'
              ? colors.success
              : blankState === 'wrong' || blankState === 'missed'
                ? colors.error
                : isActive
                  ? colors.lapis
                  : colors.inkFaint;
          return (
            <Pressable
              key={i}
              accessibilityRole={isActive ? 'button' : 'text'}
              accessibilityLabel={
                resolved
                  ? `${t.word}, ${blankState}`
                  : isActive
                    ? 'blank, answer with the choices below'
                    : 'blank'
              }
              accessibilityHint={
                isActive && !resolved
                  ? 'Long-press to reveal the word — it will be counted as missed'
                  : undefined
              }
              onLongPress={isActive ? () => settle('missed') : undefined}
              style={[
                styles.pill,
                {
                  borderColor: pillColor,
                  backgroundColor: isActive && !resolved ? colors.lapisWash : 'transparent',
                },
              ]}>
              <Text
                style={[
                  styles.pillText,
                  { color: resolved ? pillColor : 'transparent', fontFamily: fonts?.scripture },
                ]}>
                {resolved ? t.word : t.word.replace(/./g, ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeIndex !== undefined && (
        <View style={styles.chips}>
          {choices.map((choice) => (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityLabel={`Choice: ${choice}`}
              accessibilityHint="Double-tap to fill the current blank"
              onPress={() => settle(choice === tokens[activeIndex].word ? 'correct' : 'wrong')}
              style={[styles.chip, { borderColor: colors.lapis }]}>
              <Text style={[styles.chipText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                {choice}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  textWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  word: { fontSize: 20, lineHeight: 34 },
  pill: {
    borderWidth: 1.5,
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.sm,
    marginHorizontal: 2,
    marginVertical: 3,
  },
  pillText: { fontSize: 18, lineHeight: 26 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xxl,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.capsule,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipText: { fontSize: 17, fontWeight: '600' },
});
