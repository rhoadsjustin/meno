import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { useTranslation } from '@/i18n/react';
import { firstLetterList, firstLetters } from '@/services/practice';
import { useThemeColors, fonts, spacing, scriptureType } from '@/theme';

const STACK_TEXT_SCALE = 1.4;

/** Tier 1: first-letter prompt, recite, self-check against the reveal. */
export function FirstLettersRound({
  text,
  onResult,
}: {
  text: string;
  onResult: (selfPass: boolean) => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation('practice');
  const [revealed, setRevealed] = useState(false);
  // Side by side the two answers are half a row each; at large text sizes
  // their labels need the whole width (the switch Library uses).
  const stacked = useWindowDimensions().fontScale >= STACK_TEXT_SCALE;

  return (
    <>
      <Text
        // The label replaces the content for VoiceOver, so it carries the
        // letters themselves — they are the whole prompt of this tier.
        accessibilityLabel={t('firstLetters.spoken', {
          letters: firstLetterList(text).join(', '),
        })}
        style={[styles.cipher, { color: colors.ink, fontFamily: fonts?.mono }]}>
        {firstLetters(text)}
      </Text>
      {!revealed ? (
        <>
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('firstLetters.hint')}
          </Text>
          <Button
            label={t('firstLetters.reveal')}
            onPress={() => setRevealed(true)}
            style={styles.button}
          />
        </>
      ) : (
        <>
          <Text
            style={[styles.scripture, { color: colors.inkFaint, fontFamily: fonts?.scripture }]}>
            {text}
          </Text>
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('firstLetters.howDidItGo')}
          </Text>
          <View style={[styles.row, stacked && styles.rowStacked]}>
            <Button
              variant="secondary"
              label={t('firstLetters.notYet')}
              onPress={() => onResult(false)}
              style={stacked ? undefined : styles.choice}
            />
            <Button
              label={t('firstLetters.mostly')}
              onPress={() => onResult(true)}
              style={stacked ? undefined : styles.choice}
            />
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cipher: { fontSize: 17, lineHeight: 30 },
  scripture: {
    fontSize: scriptureType.minSize,
    lineHeight: 28,
    marginTop: spacing.lg,
  },
  hint: { fontSize: 15, marginTop: spacing.lg },
  button: { marginTop: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  // Primary first, as everywhere a pair of actions stacks.
  rowStacked: { flexDirection: 'column-reverse' },
  // Even halves of the row.
  choice: { flex: 1 },
});
