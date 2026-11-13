/**
 * Word-level feedback rendering (docs/07 §6): correct = success green,
 * typo = underlined, missed/wrong = error red, in place within the text.
 * Never color alone: missed/wrong also carry a strikethrough and a wash
 * highlight so the result reads without red/green discrimination. In an
 * almost (docs/03 §3) the same marks are amber instead of error red.
 *
 * Words the user added that the verse does not have are shown where they
 * were said, prefixed "+" and in italics — they cost accuracy, so a result
 * made only of them must not read as a verse marked entirely correct.
 *
 * The verse is printed as Scripture — its own capitals and punctuation, from
 * `text` — not as the lowercase tokens the grader compares. Only the word
 * itself is marked; the punctuation beside it is not struck through.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n/react';
import { feedbackSequence, feedbackSummary, type GradeResult } from '@/services/grading';
import { displayTokensForGraded } from '@/services/practice';
import { useThemeColors, fonts, spacing, textStyle } from '@/theme';

export function WordFeedback({
  result,
  text,
  language,
  tone = 'error',
}: {
  result: GradeResult;
  /** The passage that was graded, as displayed. */
  text: string;
  /** Its language (BCP 47), as given to the grader. */
  language?: string | null;
  /** `almost` marks the slips in amber rather than error red: the round was
   * close enough to move on, so it should not read as a failure. */
  tone?: 'error' | 'almost';
}) {
  const colors = useThemeColors();
  const { t } = useTranslation('practice');
  const slip = tone === 'almost' ? colors.amber : colors.error;
  const slipWash = tone === 'almost' ? colors.amberWash : colors.errorWash;
  const tokens = feedbackSequence(result);
  // Each graded word's display token, by reference index; absent where the
  // text does not split the way the grader split it (the word prints as graded).
  const display = new Map(
    displayTokensForGraded(text, result.words, { language }).map((token, i) => [
      result.words[i].index,
      token,
    ]),
  );
  const hasExtras = result.insertions.length > 0;
  return (
    // One VoiceOver element naming the slips (the marks are colour and
    // strikethrough, and a verse read word by word buries them).
    <View accessible accessibilityLabel={t('wordFeedback.label', { summary: feedbackSummary(result) })}>
      <View style={styles.wrap}>
        {tokens.map((token) => {
          if (token.kind === 'extra') {
            return (
              <Text
                key={token.key}
                style={[
                  styles.word,
                  styles.extra,
                  { color: slip, backgroundColor: slipWash, fontFamily: fonts?.scripture },
                ]}>
                +{token.word}{' '}
              </Text>
            );
          }
          const w = token.word;
          const isError = w.tag === 'missed' || w.tag === 'wrong';
          const color =
            w.tag === 'correct' ? colors.success : w.tag === 'typo' ? colors.ink : slip;
          const shown = display.get(w.index);
          return (
            <Text key={w.index} style={[styles.word, { color, fontFamily: fonts?.scripture }]}>
              {shown?.prefix}
              <Text
                style={[
                  w.tag === 'typo' && styles.typo,
                  isError && [styles.error, { backgroundColor: slipWash }],
                ]}>
                {shown?.word ?? w.word}
              </Text>
              {shown?.suffix}{' '}
            </Text>
          );
        })}
      </View>
      {hasExtras && (
        <Text style={[styles.legend, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('wordFeedback.extraLegend')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { fontSize: 20, lineHeight: 32 },
  typo: { textDecorationLine: 'underline' },
  error: { textDecorationLine: 'line-through' },
  extra: { fontStyle: 'italic' },
  legend: { ...textStyle.footnote, marginTop: spacing.sm },
});
