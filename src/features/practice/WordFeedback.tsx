/**
 * Word-level feedback rendering (docs/07 §6): correct = success green,
 * typo = underlined, missed/wrong = error red, in place within the text.
 * Never color alone: missed/wrong also carry a strikethrough and a wash
 * highlight so the result reads without red/green discrimination. In an
 * almost (docs/03 §3) the same marks are amber instead of error red.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { GradeResult } from '@/services/grading';
import { useThemeColors, fonts } from '@/theme';

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
  return (
    <View style={styles.wrap} accessibilityLabel="Word-by-word feedback">
      {result.words.map((w) => {
        const isError = w.tag === 'missed' || w.tag === 'wrong';
        const color = w.tag === 'correct' ? colors.success : w.tag === 'typo' ? colors.ink : slip;
        return (
          <Text
            key={w.index}
            accessibilityLabel={`${w.word}: ${w.tag}`}
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
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { fontSize: 20, lineHeight: 32 },
  typo: { textDecorationLine: 'underline' },
  error: { textDecorationLine: 'line-through' },
});
