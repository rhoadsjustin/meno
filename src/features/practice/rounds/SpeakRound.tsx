/**
 * Speak (tier 6, docs/03 §4; UX per 07 §6): full-screen recitation surface.
 * The mic is a single start/stop toggle pinned bottom-center; the transcript
 * accumulates across takes (stopping never erases), and between takes it is
 * directly editable in place. On-device recognition only (02 §7).
 */
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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

// Strong curves (weak built-ins read as mush).
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Joins two transcript fragments with a single space. */
function joinTranscript(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

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
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const [typeMode, setTypeMode] = useState(false);
  const [micState, setMicState] = useState<MicState>('idle');
  /** Accumulated, user-editable transcript. Never cleared by start/stop. */
  const [committed, setCommitted] = useState('');
  /** Live interim tail while listening. */
  const [interim, setInterimState] = useState('');
  const interimRef = useRef('');
  const setInterim = useCallback((value: string) => {
    interimRef.current = value;
    setInterimState(value);
  }, []);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Bias on-device recognition toward the verse's vocabulary (02 §7).
  const contextualStrings = useMemo(() => [...new Set(displayWords(text))], [text]);

  const listening = micState === 'listening';

  // ── Motion state (UI thread) ───────────────────────────────────────────
  const pressed = useSharedValue(0);
  const listeningSv = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    listeningSv.set(withTiming(listening ? 1 : 0, { duration: 200, easing: EASE_OUT }));
    if (listening && !reducedMotion) {
      // Breathing ring: state indication while the mic is hot. Dies with it.
      pulse.set(0);
      pulse.set(
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false)
      );
    } else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [listening, reducedMotion, listeningSv, pulse]);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.03 }],
    backgroundColor: interpolateColor(
      listeningSv.get(),
      [0, 1],
      [colors.lapis, colors.error]
    ),
  }));

  const ringStyle = useAnimatedStyle(() => {
    const p = pulse.get();
    return {
      opacity: listeningSv.get() * (1 - p) * 0.35,
      transform: [{ scale: 1 + p * 0.45 }],
      borderColor: colors.error,
    };
  });

  // ── Speech events ──────────────────────────────────────────────────────
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (event.isFinal) {
      setCommitted((prev) => joinTranscript(prev, transcript));
      setInterim('');
    } else {
      setInterim(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setMicState('idle');
    // A take that ends without a final result still keeps its words.
    const tail = interimRef.current;
    if (tail) setCommitted((prev) => joinTranscript(prev, tail));
    setInterim('');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setMicState('idle');
    if (event.error !== 'no-speech') {
      setSpeechError(`Speech recognition hit a snag (${event.error}). You can type instead.`);
    }
  });

  const toggleListening = useCallback(async () => {
    if (listening) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      AccessibilityInfo.announceForAccessibility('Paused. Your words are kept — edit them or keep going.');
      setMicState('processing');
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    setSpeechError(null);
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setPermission('denied');
      return;
    }
    setPermission('granted');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility('Listening. Recite, then tap again to pause.');
    setInterim('');
    ExpoSpeechRecognitionModule.start({
      lang: getTranslation(translationId).languageCode,
      interimResults: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings,
    });
    setMicState('listening');
  }, [listening, translationId, contextualStrings, setInterim]);

  const submitTranscript = useCallback(() => {
    const result = gradeSpoken(text, committed);
    onDone({
      accuracy: result.accuracy,
      missedWords: result.words.filter((w) => w.tag !== 'correct').map((w) => w.word),
      result,
    });
  }, [text, committed, onDone]);

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

  const hasWords = committed.trim().length > 0 || interim.length > 0;
  const canCheck = committed.trim().length > 0 && micState === 'idle';
  const entering = (delay = 0) =>
    FadeInDown.duration(200).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

  return (
    <View style={[styles.screen, { minHeight: height * 0.64 }]}>
      <Text style={[styles.prompt, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {reference}
      </Text>

      {permission === 'denied' && (
        <Text style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>
          Microphone or speech recognition permission is off. Enable it in Settings, or type
          instead below.
        </Text>
      )}
      {speechError && (
        <Animated.Text
          entering={FadeIn.duration(150)}
          style={[styles.error, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {speechError}
        </Animated.Text>
      )}

      {/* Transcript: live ghost while listening, editable between takes. */}
      <View style={styles.transcriptArea}>
        {hasWords ? (
          listening || micState === 'processing' ? (
            <Animated.Text
              key="ghost"
              entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
              accessibilityLabel="Live transcript"
              style={[styles.transcript, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {committed}
              {committed && interim ? ' ' : ''}
              <Text style={{ color: colors.inkFaint }}>{interim}</Text>
            </Animated.Text>
          ) : (
            <Animated.View
              key="editor"
              entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}>
              <TextInput
                multiline
                scrollEnabled={false}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                value={committed}
                onChangeText={setCommitted}
                accessibilityLabel="Your recitation — tap to edit"
                style={[
                  styles.transcript,
                  styles.transcriptInput,
                  { color: colors.ink, fontFamily: fonts?.scripture },
                ]}
              />
              <Text style={[styles.editHint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Tap the words to fix them, or keep reciting.
              </Text>
            </Animated.View>
          )
        ) : (
          <Text style={[styles.placeholder, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Recite from memory — your words appear here.
          </Text>
        )}
      </View>

      {/* Bottom cluster: check → mic (bottom-center) → type fallback. */}
      <View style={styles.bottom}>
        {canCheck && (
          <Animated.View entering={entering()} style={styles.checkWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={submitTranscript}
              style={[styles.button, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Check recitation</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.micArea}>
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Pause reciting' : 'Start reciting'}
            accessibilityHint={
              listening ? 'Your words are kept when you pause' : 'Adds to what you have said so far'
            }
            onPressIn={() => pressed.set(withTiming(1, { duration: 100, easing: EASE_OUT }))}
            onPressOut={() => pressed.set(withTiming(0, { duration: 150, easing: EASE_OUT }))}
            onPress={() => void toggleListening()}
            hitSlop={8}>
            <Animated.View style={[styles.micButton, micStyle]}>
              <Text style={styles.micGlyph}>{listening ? '⏸' : '🎙️'}</Text>
            </Animated.View>
          </Pressable>
          <Animated.Text
            key={listening ? 'l' : hasWords ? 'more' : 'start'}
            entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}
            style={[styles.micLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {listening ? 'Listening — tap to pause' : hasWords ? 'Tap to keep going' : 'Tap to recite'}
          </Animated.Text>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setTypeMode(true)}>
          <Text style={[styles.toggle, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            Type instead
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  prompt: { fontSize: 28, marginTop: spacing.md, textAlign: 'center' },
  error: { fontSize: 14, lineHeight: 19, marginTop: spacing.md, textAlign: 'center' },
  transcriptArea: { flexGrow: 1, marginTop: spacing.xl },
  transcript: { fontSize: 19, lineHeight: 30 },
  transcriptInput: { padding: 0, textAlignVertical: 'top' },
  editHint: { fontSize: 12, marginTop: spacing.sm },
  placeholder: { fontSize: 15, textAlign: 'center', marginTop: spacing.xxl },
  bottom: { marginTop: 'auto', alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xl },
  checkWrap: { alignSelf: 'stretch' },
  micArea: { alignItems: 'center', gap: spacing.md },
  pulseRing: {
    position: 'absolute',
    top: -4,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlyph: { fontSize: 36, color: '#FFFFFF' },
  micLabel: { fontSize: 14 },
  button: {
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  toggle: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
