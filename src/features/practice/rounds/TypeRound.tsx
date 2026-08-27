/**
 * Type (tier 5): reference + first word only; type the whole chunk
 * (docs/03 §1, 07 §6 — New York, no autocorrect, reference watermark).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { gradeTyped, type GradeResult } from '@/services/grading';
import { displayWords } from '@/services/practice';
import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

export function TypeRound({
  text,
  reference,
  onDone,
}: {
  text: string;
  reference: string;
  onDone: (outcome: { accuracy: number; missedWords: string[]; result: GradeResult }) => void;
}) {
  const colors = useThemeColors();
  const [input, setInput] = useState('');
  const firstWord = useMemo(() => displayWords(text)[0] ?? '', [text]);

  const submit = () => {
    const result = gradeTyped(text, input);
    onDone({
      accuracy: result.accuracy,
      missedWords: result.words.filter((w) => w.tag !== 'correct').map((w) => w.word),
      result,
    });
  };

  return (
    <>
      <Text style={[styles.watermark, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {reference} · begins “{firstWord}…”
      </Text>
      <TextInput
        multiline
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        value={input}
        onChangeText={setInput}
        placeholder="Type the passage from memory"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Type the passage from memory"
        style={[
          styles.editor,
          { color: colors.ink, borderColor: colors.separator, fontFamily: fonts?.scripture },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: input.trim().length === 0 }}
        disabled={input.trim().length === 0}
        onPress={submit}
        style={[
          styles.button,
          { backgroundColor: colors.lapis, opacity: input.trim().length === 0 ? 0.5 : 1 },
        ]}>
        <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Check</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  watermark: { fontSize: 14, marginBottom: spacing.md },
  editor: {
    minHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: spacing.xl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
