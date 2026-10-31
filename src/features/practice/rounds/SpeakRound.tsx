/**
 * Speak (tier 6, docs/03 §4; UX per 07 §6): full-screen recitation surface.
 * The mic is a single start/stop toggle pinned bottom-center; the transcript
 * accumulates across takes (stopping never erases), and between takes it is
 * directly editable in place. On-device recognition only (02 §7): a language
 * this phone can't hear on the device turns the round into a typed one.
 */
import { getLocales } from 'expo-localization';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
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

import { useTranslation } from '@/i18n/react';
import { getTranslation } from '@/services/bible';
import { gradeSpoken, type GradeResult } from '@/services/grading';
import { displayWords } from '@/services/practice';
import { recognizerLocale } from '@/services/speech/locale';
import { TypeRound } from '@/features/practice/rounds/TypeRound';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

export type SpeakOutcome = {
  accuracy: number;
  /** Reference words — the length the tier's tolerance scales to. */
  unitCount: number;
  missedWords: string[];
  result: GradeResult;
  /** True when the user answered by typing instead of speaking. */
  typed?: boolean;
};

type MicState = 'idle' | 'listening' | 'processing';

/** Why this phone can't hear the verse: no recognizer for its language, or none on the device. */
type Unavailable = 'language' | 'offline';

/**
 * The recognizer locale for a translation, or why there is none. iOS needs an
 * exact supported locale and, with on-device only, a recognizer that runs
 * without the network. Android keeps the raw code when its service can't say
 * (the offline-pack check and its errors handle the rest).
 */
async function resolveRecognizer(
  languageCode: string,
): Promise<{ locale: string } | { unavailable: Unavailable }> {
  const supported = await ExpoSpeechRecognitionModule.getSupportedLocales({})
    .then((r) => r.locales)
    .catch(() => [] as string[]);
  const device = getLocales().map((l) => l.languageTag);
  const locale = recognizerLocale(languageCode, supported, device);
  // An empty list means the service couldn't say; try, and let the error tell.
  if (Platform.OS !== 'ios' || supported.length === 0) return { locale: locale ?? languageCode };
  if (!locale) return { unavailable: 'language' };
  const onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognitionForLocale?.(locale);
  if (onDevice === false) return { unavailable: 'offline' };
  return { locale };
}

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
  const { t } = useTranslation('practice');
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
  // Android only: the offline speech pack for the verse's language is missing.
  const [pack, setPack] = useState<'ok' | 'missing' | 'downloading'>('ok');
  // iOS: the verse's language can't be recognized on this phone.
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null);
  const languageCode = getTranslation(translationId).languageCode;
  const recognizer = useMemo(() => resolveRecognizer(languageCode), [languageCode]);
  useEffect(() => {
    let live = true;
    void recognizer.then((r) => {
      if (live && 'unavailable' in r) setUnavailable(r.unavailable);
    });
    return () => {
      live = false;
    };
  }, [recognizer]);

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
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false),
      );
    } else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [listening, reducedMotion, listeningSv, pulse]);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.03 }],
    backgroundColor: interpolateColor(listeningSv.get(), [0, 1], [colors.lapis, colors.error]),
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
    switch (event.error) {
      case 'no-speech':
      case 'speech-timeout':
        return;
      case 'not-allowed':
      case 'service-not-allowed':
        setPermission('denied');
        return;
      case 'audio-capture':
      case 'busy':
        setSpeechError(t('speak.micBusy'));
        return;
      case 'language-not-supported':
        if (Platform.OS === 'android') {
          setPack('missing');
          return;
        }
        // The patched iOS recognizer refuses rather than going online.
        setUnavailable('offline');
        return;
    }
    setSpeechError(t('speak.error', { error: event.error }));
  });

  const downloadPack = useCallback(async () => {
    try {
      const r = await recognizer;
      if (!('locale' in r)) return;
      await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: r.locale });
      setPack('downloading');
    } catch {
      setPack('ok');
      setSpeechError(t('speak.offlineUnsupported'));
    }
  }, [recognizer, t]);

  const toggleListening = useCallback(async () => {
    if (listening) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      AccessibilityInfo.announceForAccessibility(t('speak.pausedAnnouncement'));
      setMicState('processing');
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    setSpeechError(null);
    const resolved = await recognizer;
    if ('unavailable' in resolved) {
      setUnavailable(resolved.unavailable);
      return;
    }
    const lang = resolved.locale;
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setPermission('denied');
      return;
    }
    setPermission('granted');
    // Recitation audio never leaves the phone, so there is no cloud
    // fallback: an Android phone needs on-device recognition and the
    // offline pack for the verse's language.
    if (Platform.OS === 'android') {
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
        setSpeechError(t('speak.offlineUnsupported'));
        return;
      }
      const installed = await ExpoSpeechRecognitionModule.getSupportedLocales({})
        .then((r) => r.installedLocales)
        .catch(() => [] as string[]);
      // An empty list means the service can't say; try, and let the error tell.
      const base = lang.split('-')[0].toLowerCase();
      if (installed.length > 0 && !installed.some((l) => l.toLowerCase().startsWith(base))) {
        setPack('missing');
        return;
      }
      setPack('ok');
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility(t('speak.listeningAnnouncement'));
    setInterim('');
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      requiresOnDeviceRecognition: true,
      // Android ends a take at the first pause; a verse has many.
      continuous: Platform.OS === 'android',
      addsPunctuation: false,
      contextualStrings,
    });
    setMicState('listening');
  }, [listening, recognizer, contextualStrings, setInterim, t]);

  const submitTranscript = useCallback(() => {
    const result = gradeSpoken(text, committed, {
      language: getTranslation(translationId).languageCode,
    });
    onDone({
      accuracy: result.accuracy,
      unitCount: result.unitCount,
      missedWords: result.words.filter((w) => w.tag !== 'correct').map((w) => w.word),
      result,
    });
  }, [text, committed, translationId, onDone]);

  if (typeMode || unavailable) {
    return (
      <>
        {unavailable && (
          <Animated.Text
            entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
            style={[styles.notice, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t(
              unavailable === 'language' ? 'speak.unavailableLanguage' : 'speak.unavailableOffline',
            )}
          </Animated.Text>
        )}
        <TypeRound
          text={text}
          reference={reference}
          translationId={translationId}
          onDone={(o) => onDone({ ...o, typed: true })}
        />
        {!unavailable && (
          <Pressable accessibilityRole="button" onPress={() => setTypeMode(false)}>
            <Text style={[styles.toggle, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('speak.speakInstead')}
            </Text>
          </Pressable>
        )}
      </>
    );
  }

  const hasWords = committed.trim().length > 0 || interim.length > 0;
  const canCheck = committed.trim().length > 0 && micState === 'idle';
  const entering = (delay = 0) =>
    FadeInDown.duration(200).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

  return (
    // The surface claims most of the window so the mic sits low; on a short
    // window (iPhone Duo's cover panel, or opened in landscape) that share
    // pushed "Type instead" onto the bottom edge once the sealing note was
    // above it, so it takes less there.
    <View
      style={[styles.screen, { minHeight: height * (height < layout.shortHeight ? 0.52 : 0.64) }]}>
      {/* A long reference at an accessibility text size shrinks to fit rather
          than breaking mid-word ("Thessalonian" / "s"). */}
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        style={[styles.prompt, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {reference}
      </Text>

      {permission === 'denied' && (
        <Text style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>
          {t('speak.permissionOff')}
        </Text>
      )}
      {pack !== 'ok' && (
        <View style={styles.packArea}>
          <Text style={[styles.error, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t(pack === 'missing' ? 'speak.packMissing' : 'speak.packDownloading')}
          </Text>
          {pack === 'missing' && (
            <Pressable accessibilityRole="button" onPress={() => void downloadPack()}>
              <Text style={[styles.packButton, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                {t('speak.packDownload')}
              </Text>
            </Pressable>
          )}
        </View>
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
              accessibilityLabel={t('speak.liveTranscript')}
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
                accessibilityLabel={t('speak.editLabel')}
                style={[
                  styles.transcript,
                  styles.transcriptInput,
                  { color: colors.ink, fontFamily: fonts?.scripture },
                ]}
              />
              <Text style={[styles.editHint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t('speak.editHint')}
              </Text>
            </Animated.View>
          )
        ) : (
          <Text style={[styles.placeholder, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('speak.placeholder')}
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
              <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>{t('speak.check')}</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.micArea}>
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? t('speak.pause') : t('speak.start')}
            accessibilityHint={listening ? t('speak.pauseHint') : t('speak.startHint')}
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
            {listening
              ? t('speak.micListening')
              : hasWords
                ? t('speak.micMore')
                : t('speak.micStart')}
          </Animated.Text>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setTypeMode(true)}>
          <Text style={[styles.toggle, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('speak.typeInstead')}
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
  notice: { fontSize: 14, lineHeight: 19, marginBottom: spacing.lg, textAlign: 'center' },
  packArea: { alignItems: 'center' },
  packButton: { fontSize: 15, fontWeight: '600', marginTop: spacing.sm, padding: spacing.sm },
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
