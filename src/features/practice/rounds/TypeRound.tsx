/**
 * Type (tier 5): reference + first word only; type the whole chunk
 * (docs/03 §1, 07 §6 — New York, no autocorrect, reference watermark).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
} from 'react-native';

import { useRevealAboveKeyboard } from '@/components/keyboard-scroll';

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
  onDone: (outcome: {
    accuracy: number;
    unitCount: number;
    missedWords: string[];
    result: GradeResult;
  }) => void;
}) {
  const colors = useThemeColors();
  const [input, setInput] = useState('');
  // A fixed box that scrolls inside, a little taller at large text sizes.
  // Left to grow with the text, the line being typed slid under the keyboard
  // (most of all at accessibility sizes). At a fixed height the screen can
  // lift the whole editor — and Check beneath it — above the keyboard once,
  // when the keyboard appears, and the editor keeps the caret in view itself.
  const { fontScale } = useWindowDimensions();
  const editorHeight = EDITOR_HEIGHT * Math.min(fontScale, 1.3);
  const editor = useRef<TextInput>(null);
  const reveal = useRevealAboveKeyboard();
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (editor.current?.isFocused()) reveal(editor.current, CHECK_ROOM * Math.min(fontScale, 1.6));
    });
    return () => sub.remove();
  }, [reveal, fontScale]);
  const firstWord = useMemo(() => displayWords(text)[0] ?? '', [text]);

  const submit = () => {
    const result = gradeTyped(text, input);
    onDone({
      accuracy: result.accuracy,
      unitCount: result.unitCount,
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
        ref={editor}
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
          { height: editorHeight },
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

const EDITOR_HEIGHT = 180;
/** The Check button and the gap above it, kept in view under the editor. */
const CHECK_ROOM = 84;

const styles = StyleSheet.create({
  watermark: { fontSize: 14, marginBottom: spacing.md },
  editor: {
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
