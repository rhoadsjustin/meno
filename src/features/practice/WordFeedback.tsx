/**
 * Word-level feedback rendering (docs/07 §6): correct = success green,
 * typo = underlined, missed/wrong = error red, in place within the text.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { GradeResult } from '@/services/grading';
import { useThemeColors, fonts } from '@/theme';

export function WordFeedback({ result }: { result: GradeResult }) {
  const colors = useThemeColors();
  return (
    <View style={styles.wrap} accessibilityLabel="Word-by-word feedback">
      {result.words.map((w) => {
        const color =
          w.tag === 'correct'
            ? colors.success
            : w.tag === 'typo'
              ? colors.ink
              : colors.error;
        return (
          <Text
            key={w.index}
            accessibilityLabel={`${w.word}: ${w.tag}`}
            style={[
              styles.word,
              { color, fontFamily: fonts?.scripture },
              w.tag === 'typo' && styles.typo,
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
});
