import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { firstLetters } from '@/services/practice';
import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

/** Tier 1: first-letter prompt, recite, self-check against the reveal. */
export function FirstLettersRound({
  text,
  onResult,
}: {
  text: string;
  onResult: (selfPass: boolean) => void;
}) {
  const colors = useThemeColors();
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <Text
        accessibilityLabel="First letters of the passage"
        style={[styles.cipher, { color: colors.ink, fontFamily: fonts?.mono }]}>
        {firstLetters(text)}
      </Text>
      {!revealed ? (
        <>
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Recite from the letters — aloud or in your head — then check yourself.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRevealed(true)}
            style={[styles.button, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Reveal</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.scripture, { color: colors.inkFaint, fontFamily: fonts?.scripture }]}>
            {text}
          </Text>
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            How did it go?
          </Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onResult(false)}
              style={[styles.secondary, { borderColor: colors.separator }]}>
              <Text style={[styles.secondaryText, { color: colors.ink, fontFamily: fonts?.ui }]}>
                Not yet
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onResult(true)}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Mostly got it</Text>
            </Pressable>
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
  button: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  primary: {
    flex: 1,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondary: {
    flex: 1,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryText: { fontSize: 17, fontWeight: '600' },
});
