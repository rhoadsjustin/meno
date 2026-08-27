import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

/** Tier 0: read the full text aloud slowly, twice (docs/03 §1). */
export function ReadRound({ text, onDone }: { text: string; onDone: () => void }) {
  const colors = useThemeColors();
  return (
    <>
      <Text style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {text}
      </Text>
      <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        Read it aloud, slowly, twice. Let the words settle.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={[styles.button, { backgroundColor: colors.lapis }]}>
        <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>I’ve read it twice</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  hint: { fontSize: 15, marginTop: spacing.lg },
  button: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
