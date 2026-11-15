/**
 * Blanks 25/50/75 (docs/03 §1): blanked words as pills inside the text,
 * answered in order from 3-choice chips. Long-press the active blank to
 * reveal it — counted as missed (03 §3 "reveal = miss").
 */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/components/button';
import { useTranslation } from '@/i18n/react';
import { displayTokens, hashSeed, mulberry32, selectBlanks, shuffle } from '@/services/practice';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

export type BlanksOutcome = {
  accuracy: number;
  /** Blanks in this round — the length the tier's tolerance scales to. */
  unitCount: number;
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
  const { t } = useTranslation('practice');
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
    const pool = [...new Set(tokens.map((tok) => tok.word).filter((w) => w.toLowerCase() !== correct.toLowerCase()))];
    const rand = mulberry32(hashSeed(chunkId, 'choices', attemptNo, activeIndex));
    const distractors = shuffle(pool, rand).slice(0, 2);
    return shuffle([correct, ...distractors], rand);
  }, [activeIndex, tokens, chunkId, attemptNo]);

  const settle = (state: BlankState) => {
    const next = { ...states, [activeIndex]: state };
    setStates(next);
    if (state === 'correct') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // VoiceOver: the haptic alone does not say whether the answer was right
    // or where the next blank is. The words keep their one-by-one reading
    // order; this only speaks the result and the lead-in to the next blank.
    const word = tokens[activeIndex].word;
    const said: string[] = [
      state === 'correct'
        ? t('blanks.saidCorrect')
        : state === 'missed'
          ? t('blanks.saidMissed', { word })
          : t('blanks.saidWrong', { word }),
    ];

    if (cursor + 1 < blankIndices.length) {
      const nextIndex = blankIndices[cursor + 1];
      // Every earlier blank is answered by now, so these are all real words.
      const words = tokens
        .slice(Math.max(0, nextIndex - 4), nextIndex)
        .map((tok) => tok.word)
        .join(' ');
      const place = { index: cursor + 2, total: blankIndices.length };
      said.push(
        words ? t('blanks.nextBlankAfter', { ...place, words }) : t('blanks.nextBlank', place),
      );
      AccessibilityInfo.announceForAccessibility(said.join(' '));
      setCursor(cursor + 1);
    } else {
      AccessibilityInfo.announceForAccessibility(said.join(' '));
      const values = blankIndices.map((i) => next[i]);
      const correct = values.filter((s) => s === 'correct').length;
      onDone({
        accuracy: blankIndices.length === 0 ? 1 : correct / blankIndices.length,
        unitCount: blankIndices.length,
        missedWords: blankIndices.filter((i) => next[i] !== 'correct').map((i) => tokens[i].word),
      });
    }
  };

  return (
    <>
      {/* No label here: the words and blanks are read one by one, and a label
          on a container that is not itself an element is never spoken. */}
      <View style={styles.textWrap}>
        {tokens.map((tok, i) => {
          const blankState = states[i];
          if (blankState === undefined) {
            return (
              <Text key={i} style={[styles.word, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                {tok.prefix}
                {tok.word}
                {tok.suffix}{' '}
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
                  ? t(`blanks.${blankState as 'correct' | 'wrong' | 'missed'}`, { word: tok.word })
                  : isActive
                    ? t('blanks.active')
                    : t('blanks.blank')
              }
              accessibilityHint={
                isActive && !resolved
                  ? t('blanks.revealHint')
                  : undefined
              }
              // VoiceOver: answer in place from the actions rotor, without
              // leaving the verse to find the chips below it.
              accessibilityActions={
                isActive && !resolved
                  ? [
                      ...choices.map((choice, n) => ({
                        name: `choice-${n}`,
                        label: t('blanks.answerWith', { choice }),
                      })),
                      { name: 'reveal', label: t('blanks.reveal') },
                    ]
                  : undefined
              }
              onAccessibilityAction={
                isActive && !resolved
                  ? (e) => {
                      const name = e.nativeEvent.actionName;
                      if (name === 'reveal') {
                        settle('missed');
                        return;
                      }
                      const choice = choices[Number(name.replace('choice-', ''))];
                      if (choice !== undefined) settle(choice === tok.word ? 'correct' : 'wrong');
                    }
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
                  (blankState === 'wrong' || blankState === 'missed') && styles.pillTextError,
                ]}>
                {resolved ? tok.word : tok.word.replace(/./g, ' ')}
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
              accessibilityLabel={t('blanks.choice', { choice })}
              accessibilityHint={t('blanks.choiceHint')}
              onPress={() => settle(choice === tokens[activeIndex].word ? 'correct' : 'wrong')}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: colors.lapis },
                pressed && styles.pressed,
              ]}>
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
  pillTextError: { textDecorationLine: 'line-through' },
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
    // A wrong chip is graded as a miss, so each is a full touch target.
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.6 },
  chipText: { fontSize: 17, fontWeight: '600' },
});
