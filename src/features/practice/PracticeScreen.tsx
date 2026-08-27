/**
 * Practice session (docs/03 §8, 07 §6): minimal chrome, progress dots,
 * mode-specific rounds, word-level feedback, resumable at any point.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRange, getPassage } from '@/services/bible';
import { recordAttempt } from '@/services/db/repos/attempts';
import {
  applyTierCleared,
  currentChunk,
  getGoal,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from '@/services/db/repos/sessionStore';
import { secureToday } from '@/services/db/repos/streaks';
import type { GradeResult } from '@/services/grading';
import {
  blanksDensity,
  currentMode,
  recordRound,
  startSession,
  tierDef,
  type SessionState,
} from '@/services/practice';
import { WordFeedback } from '@/features/practice/WordFeedback';
import { ArrangeRound } from '@/features/practice/rounds/ArrangeRound';
import { BlanksRound } from '@/features/practice/rounds/BlanksRound';
import { FirstLettersRound } from '@/features/practice/rounds/FirstLettersRound';
import { ReadRound } from '@/features/practice/rounds/ReadRound';
import { SpeakRound } from '@/features/practice/rounds/SpeakRound';
import { TypeRound } from '@/features/practice/rounds/TypeRound';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'round' }
  | {
      kind: 'feedback';
      accuracy: number;
      passed: boolean;
      tierCleared: boolean;
      suggestDropTier: boolean;
      result?: GradeResult;
    };

export function PracticeScreen({ goalId }: { goalId: string }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [chunk, setChunk] = useState<Chunk | null>(null);
  const [text, setText] = useState('');
  const [session, setSession] = useState<SessionState | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [roundStartedAt, setRoundStartedAt] = useState(0);

  const load = useCallback(async () => {
    const g = await getGoal(goalId);
    if (!g) throw new Error('Goal not found');
    const c = await currentChunk(goalId);
    if (!c) {
      setPhase({ kind: 'error', message: 'Every chunk in this goal is memorized. Well done.' });
      setGoal(g);
      return;
    }
    const verses = await getPassage(g.translationId, {
      start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
      end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
    });
    const chunkText = verses.map((v) => v.text).join(' ');

    // Resume a persisted session for this chunk, else start fresh
    // (M2 acceptance: killing the app mid-session resumes correctly).
    const saved = await loadActiveSession();
    const s =
      saved && saved.chunkId === c.id && saved.roundIndex < saved.rounds.length
        ? saved
        : startSession({ goalId, chunkId: c.id, highestClearedTier: c.tier, now: Date.now() });
    await saveActiveSession(s);

    setGoal(g);
    setChunk(c);
    setText(chunkText);
    setSession(s);
    setPhase({ kind: 'round' });
    setRoundStartedAt(Date.now());
  }, [goalId]);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [load]);

  const finishRound = useCallback(
    async (input: { accuracy?: number; selfPass?: boolean; missedWords?: string[]; result?: GradeResult }) => {
      if (!session || !chunk) return;
      const outcome = recordRound(session, input);
      setSession(outcome.state);
      await saveActiveSession(outcome.state);

      await recordAttempt({
        chunkId: chunk.id,
        mode: currentMode(session),
        accuracy: input.accuracy ?? (input.selfPass ? 1 : 0),
        durationMs: Date.now() - roundStartedAt,
        missedWords: input.missedWords ?? [],
        source: 'practice',
      });
      await secureToday(); // any completed practice item counts (docs/06 §1)

      if (outcome.passed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (outcome.tierCleared) {
        await applyTierCleared(chunk, session.tier);
        await clearActiveSession();
        const { refreshBadges } = await import('@/services/db/repos/badges');
        void refreshBadges();
      }

      setPhase({
        kind: 'feedback',
        accuracy: input.accuracy ?? (input.selfPass ? 1 : 0),
        passed: outcome.passed,
        tierCleared: outcome.tierCleared,
        suggestDropTier: outcome.suggestDropTier,
        result: input.result,
      });
    },
    [session, chunk, roundStartedAt]
  );

  const continueSession = useCallback(async () => {
    if (phase.kind !== 'feedback') return;
    if (phase.tierCleared) {
      // Reload: next tier for this chunk, or the next chunk.
      setPhase({ kind: 'loading' });
      await load();
    } else {
      setPhase({ kind: 'round' });
      setRoundStartedAt(Date.now());
    }
  }, [phase, load]);

  if (phase.kind === 'loading') {
    return <View style={[styles.root, { backgroundColor: colors.surface }]} />;
  }

  const reference = chunk
    ? formatRange({
        start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
        end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
      })
    : '';

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={styles.chrome}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close practice (your progress is saved)"
          onPress={() => router.back()}
          hitSlop={12}>
          <Text style={[styles.close, { color: colors.inkFaint }]}>✕</Text>
        </Pressable>
        {session && (
          <View style={styles.dots} accessibilityLabel={`Round ${Math.min(session.roundIndex + 1, session.rounds.length)} of ${session.rounds.length}`}>
            {session.rounds.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i < session.roundIndex ? colors.lapis : colors.separator },
                ]}
              />
            ))}
          </View>
        )}
        <View style={styles.closeSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {phase.kind === 'error' && (
            <>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {phase.message}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>Done</Text>
              </Pressable>
            </>
          )}

          {phase.kind === 'round' && session && chunk && (
            <>
              <Text style={[styles.reference, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {reference} · {tierDef(session.tier).name}
              </Text>
              <RoundBody
                key={`${session.roundIndex}-${session.attemptNo}`}
                session={session}
                text={text}
                reference={reference}
                translationId={goal?.translationId ?? 'web'}
                onFinish={finishRound}
              />
            </>
          )}

          {phase.kind === 'feedback' && session && (
            <>
              <Text
                style={[
                  styles.accuracy,
                  {
                    color: phase.tierCleared
                      ? colors.gold
                      : phase.passed
                        ? colors.success
                        : colors.error,
                    fontFamily: fonts?.scripture,
                  },
                ]}>
                {Math.round(phase.accuracy * 100)}%
              </Text>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {phase.tierCleared
                  ? `${tierDef(session.tier).name} cleared`
                  : phase.passed
                    ? 'Round passed'
                    : 'Not quite — the slipped words are marked below'}
              </Text>
              {phase.result && <WordFeedback result={phase.result} />}
              {phase.suggestDropTier && (
                <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  Want to rebuild the foundation? You can drop back a tier any time — no penalty.
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => void continueSession()}
                style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>
                  {phase.tierCleared ? 'Continue' : phase.passed ? 'Next round' : 'Try again'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoundBody({
  session,
  text,
  reference,
  translationId,
  onFinish,
}: {
  session: SessionState;
  text: string;
  reference: string;
  translationId: string;
  onFinish: (input: {
    accuracy?: number;
    selfPass?: boolean;
    missedWords?: string[];
    result?: GradeResult;
  }) => void;
}) {
  const mode = currentMode(session);
  switch (mode) {
    case 'read':
      return <ReadRound text={text} onDone={() => onFinish({ selfPass: true })} />;
    case 'firstLetters':
      return <FirstLettersRound text={text} onResult={(selfPass) => onFinish({ selfPass })} />;
    case 'blanks25':
    case 'blanks50':
    case 'blanks75':
      return (
        <BlanksRound
          text={text}
          density={blanksDensity(mode)}
          chunkId={session.chunkId}
          attemptNo={session.attemptNo}
          onDone={(o) => onFinish(o)}
        />
      );
    case 'arrange':
      return (
        <ArrangeRound
          text={text}
          chunkId={session.chunkId}
          attemptNo={session.attemptNo}
          onDone={(o) => onFinish(o)}
        />
      );
    case 'type':
      return <TypeRound text={text} reference={reference} onDone={(o) => onFinish(o)} />;
    case 'speak':
      return (
        <SpeakRound
          text={text}
          reference={reference}
          translationId={translationId}
          onDone={(o) => onFinish(o)}
        />
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.sm,
  },
  close: { fontSize: 20 },
  closeSpacer: { width: 20 },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: {
    padding: layout.screenMargin,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  reference: { fontSize: 14, marginBottom: spacing.lg },
  heading: { fontSize: 20, fontWeight: '600', marginVertical: spacing.md },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  suggestion: { fontSize: 15, lineHeight: 20, marginTop: spacing.md },
  primaryButton: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
