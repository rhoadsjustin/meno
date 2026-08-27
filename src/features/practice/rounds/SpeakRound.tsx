/**
 * Speak (tier 6, docs/03 §4; UX per 07 §6): large mic button, live ghost
 * transcript, on-device recognition only (02 §7 — no verse audio leaves the
 * phone). Grading applies phonetic leniency; an instant "Type instead"
 * toggle covers loud rooms and mic-shy moments.
 */
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { getTranslation } from '@/services/bible';
import { gradeSpoken, type GradeResult } from '@/services/grading';
import { displayWords } from '@/services/practice';
import { TypeRound } from '@/features/practice/rounds/TypeRound';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

export type SpeakOutcome = {
  accuracy: number;
  missedWords: string[];
  result: GradeResult;
  /** True when the user answered by typing instead of speaking. */
  typed?: boolean;
};

type MicState = 'idle' | 'listening' | 'processing';

export function SpeakRound({
  text,
  reference,
  translationId,
  onDone,
}: {
  text: string;
  reference: string;
  translationId: string;
  onDone: (outcome: SpeakOutcome) => void;
}) {
  const colors = useThemeColors();
  const [typeMode, setTypeMode] = useState(false);
  const [micState, setMicState] = useState<MicState>('idle');
  const [ghost, setGhost] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Bias on-device recognition toward the verse's vocabulary (02 §7) —
  // archaic and rare words ("thee", "propitiation", proper nouns).
  const contextualStrings = useMemo(() => [...new Set(displayWords(text))], [text]);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (event.isFinal) {
      setFinalTranscript(transcript);
    } else {
      setGhost(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setMicState('idle');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setMicState('idle');
    // Noisy room / no speech → offer the Type fallback without losing the
    // session (03 §4.6).
    setSpeechError(
      event.error === 'no-speech'
        ? 'Couldn’t hear you — try again closer to the mic, or type instead.'
        : `Speech recognition hit a snag (${event.error}). You can type instead.`
    );
  });

  const beginListening = useCallback(async () => {
    AccessibilityInfo.announceForAccessibility('Listening. Recite the passage, then tap to finish.');
    setSpeechError(null);
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setPermission('denied');
      return;
    }
    setPermission('granted');
    setGhost('');
    setFinalTranscript('');
    ExpoSpeechRecognitionModule.start({
      lang: getTranslation(translationId).languageCode,
      interimResults: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings,
    });
    setMicState('listening');
  }, [translationId, contextualStrings]);

  const finishListening = useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Finished listening.');
    setMicState('processing');
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const submitTranscript = useCallback(() => {
    const result = gradeSpoken(text, finalTranscript);
    onDone({
      accuracy: result.accuracy,
      missedWords: result.words.filter((w) => w.tag !== 'correct').map((w) => w.word),
      result,
    });
  }, [text, finalTranscript, onDone]);

  if (typeMode) {
    return (
      <>
        <TypeRound
          text={text}
          reference={reference}
          onDone={(o) => onDone({ ...o, typed: true })}
        />
        <Pressable accessibilityRole="button" onPress={() => setTypeMode(false)}>
          <Text style={[styles.toggle, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            Speak instead
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <Text style={[styles.prompt, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {reference}
      </Text>
      <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        Recite the passage aloud from memory.
      </Text>

      {permission === 'denied' && (
        <Text style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>
          Microphone or speech recognition permission is off. Enable it in Settings, or type
          instead below.
        </Text>
      )}
      {speechError && (
        <Text style={[styles.error, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {speechError}
        </Text>
      )}

      {(ghost.length > 0 || finalTranscript.length > 0) && (
        <Text
          accessibilityLabel="Live transcript"
          style={[styles.ghost, { color: colors.inkFaint, fontFamily: fonts?.scripture }]}>
          {finalTranscript || ghost}
        </Text>
      )}

      <View style={styles.micArea}>
        {micState === 'listening' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop recording"
            onPress={finishListening}
            style={[styles.micButton, { backgroundColor: colors.error }]}>
            <Text style={styles.micGlyph}>■</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start reciting"
            onPress={() => void beginListening()}
            style={[styles.micButton, { backgroundColor: colors.lapis }]}>
            <Text style={styles.micGlyph}>🎙️</Text>
          </Pressable>
        )}
        <Text style={[styles.micLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {micState === 'listening' ? 'Listening… tap to finish' : 'Tap to recite'}
        </Text>
      </View>

      {finalTranscript.length > 0 && micState === 'idle' && (
        <Pressable
          accessibilityRole="button"
          onPress={submitTranscript}
          style={[styles.button, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Check recitation</Text>
        </Pressable>
      )}

      <Pressable accessibilityRole="button" onPress={() => setTypeMode(true)}>
        <Text style={[styles.toggle, { color: colors.lapis, fontFamily: fonts?.ui }]}>
          Type instead
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 28, marginTop: spacing.md },
  hint: { fontSize: 15, marginTop: spacing.sm },
  error: { fontSize: 14, lineHeight: 19, marginTop: spacing.md },
  ghost: { fontSize: 18, lineHeight: 28, marginTop: spacing.lg, fontStyle: 'italic' },
  micArea: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlyph: { fontSize: 34, color: '#FFFFFF' },
  micLabel: { fontSize: 14 },
  button: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  toggle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: spacing.xl },
});
