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
 */
import { StyleSheet, Text, View } from 'react-native';

import { feedbackSequence, feedbackSummary, type GradeResult } from '@/services/grading';
import { useThemeColors, fonts, spacing } from '@/theme';

export function WordFeedback({
  result,
  tone = 'error',
}: {
  result: GradeResult;
  /** `almost` marks the slips in amber rather than error red: the round was
   * close enough to move on, so it should not read as a failure. */
  tone?: 'error' | 'almost';
}) {
  const colors = useThemeColors();
  const slip = tone === 'almost' ? colors.amber : colors.error;
  const slipWash = tone === 'almost' ? colors.amberWash : colors.errorWash;
  const tokens = feedbackSequence(result);
  const hasExtras = result.insertions.length > 0;
  return (
    // One VoiceOver element naming the slips (the marks are colour and
    // strikethrough, and a verse read word by word buries them).
    <View accessible accessibilityLabel={`Word-by-word feedback. ${feedbackSummary(result)}`}>
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
          return (
            <Text
              key={w.index}
              style={[
                styles.word,
                { color, fontFamily: fonts?.scripture },
                w.tag === 'typo' && styles.typo,
                isError && [styles.error, { backgroundColor: slipWash }],
              ]}>
              {w.word}{' '}
            </Text>
          );
        })}
      </View>
      {hasExtras && (
        <Text style={[styles.legend, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          + marks a word you added that is not in the verse.
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
  legend: { fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
});
