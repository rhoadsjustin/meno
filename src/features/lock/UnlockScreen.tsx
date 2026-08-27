/**
 * Recite-to-unlock quiz (docs/04 §4): one job, minimal chrome. Speak by
 * default with an instant Type toggle, forgiving 85% threshold, one retry,
 * then Override offered prominently. Never traps the user (04 §6).
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRange, getPassage } from '@/services/bible';
import { activeGoal, chunksForGoal, currentChunk, type Chunk } from '@/services/db/repos/goals';
import { loadLockConfig, recordLockEvent } from '@/services/db/repos/lock';
import { secureToday } from '@/services/db/repos/streaks';
import { recordAttempt } from '@/services/db/repos/attempts';
import { clearShields, registerUnlockMount, scheduleRelock } from '@/services/lock';
import { SpeakRound, type SpeakOutcome } from '@/features/practice/rounds/SpeakRound';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

/** Forgiving threshold — friction-with-grace, not an exam (04 §4). */
const UNLOCK_THRESHOLD = 0.85;

type Phase =
  | { kind: 'loading' }
  | { kind: 'quiz'; attempt: number }
  | { kind: 'failed'; attempt: number; accuracy: number }
  | { kind: 'success'; accuracy: number }
  | { kind: 'error'; message: string };

export function UnlockScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  // Single-instance guard: while mounted, presentUnlock() is a no-op.
  useEffect(() => registerUnlockMount(), []);
  const [verse, setVerse] = useState<{
    chunk: Chunk | null;
    reference: string;
    text: string;
    translationId: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadLockConfig();
        const goal = await activeGoal();
        if (!goal) throw new Error('No active goal');
        // Verse source (04 §1.3): current chunk, or a random memorized one;
        // fall back to the current chunk when nothing is memorized (04 §7).
        let chunk: Chunk | null = null;
        if (config.verseSource === 'randomMemorized') {
          const memorized = (await chunksForGoal(goal.id)).filter((c) => c.status === 'memorized');
          if (memorized.length > 0) {
            chunk = memorized[Math.floor(Math.random() * memorized.length)];
          }
        }
        chunk ??= (await currentChunk(goal.id)) ?? null;
        if (!chunk) throw new Error('Nothing to recite yet');
        const range = {
          start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
          end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
        };
        const verses = await getPassage(goal.translationId, range);
        setVerse({
          chunk,
          reference: formatRange(range),
          text: verses.map((v) => v.text).join(' '),
          translationId: goal.translationId,
        });
        setPhase({ kind: 'quiz', attempt: 1 });
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, []);

  const unlock = useCallback(async (accuracy: number) => {
    const config = await loadLockConfig();
    clearShields();
    if (config.mode === 'everyPickup') {
      await scheduleRelock(config.relockMinutes ?? 30);
    }
    await recordLockEvent({
      type: 'reciteSuccess',
      verseChunkId: verse?.chunk?.id,
      accuracy,
    });
    if (verse?.chunk) {
      await recordAttempt({
        chunkId: verse.chunk.id,
        mode: 'speak',
        accuracy,
        durationMs: 0,
        missedWords: [],
        source: 'unlock',
      });
    }
    await secureToday(); // recite-to-unlock counts toward the streak (04 §4)
    const { refreshBadges } = await import('@/services/db/repos/badges');
    void refreshBadges();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase({ kind: 'success', accuracy });
    // Brief success (<1.5s), then out of the way (04 §4).
    setTimeout(() => router.back(), 1400);
  }, [verse]);

  const override = useCallback(async () => {
    clearShields();
    await recordLockEvent({ type: 'override', verseChunkId: verse?.chunk?.id });
    router.back();
  }, [verse]);

  const onRoundDone = useCallback(
    (outcome: SpeakOutcome) => {
      if (phase.kind !== 'quiz') return;
      if (outcome.accuracy >= UNLOCK_THRESHOLD) {
        void unlock(outcome.accuracy);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPhase({ kind: 'failed', attempt: phase.attempt, accuracy: outcome.accuracy });
      }
    },
    [phase, unlock]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {phase.kind === 'error' && (
          <>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {phase.message}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void override()} style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Unlock anyway</Text>
            </Pressable>
          </>
        )}

        {phase.kind === 'quiz' && verse && (
          <SpeakRound
            key={phase.attempt}
            text={verse.text}
            reference={verse.reference}
            translationId={verse.translationId}
            onDone={onRoundDone}
          />
        )}

        {phase.kind === 'failed' && (
          <>
            <Text style={[styles.accuracy, { color: colors.error, fontFamily: fonts?.scripture }]}>
              {Math.round(phase.accuracy * 100)}%
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Close — a few words slipped. {phase.attempt === 1 ? 'One more go?' : ''}
            </Text>
            {phase.attempt === 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setPhase({ kind: 'quiz', attempt: 2 })}
                style={[styles.primary, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Try again</Text>
              </Pressable>
            ) : (
              // After a second miss, Override is the prominent path —
              // never a failed-quiz loop (04 §4).
              <Pressable
                accessibilityRole="button"
                onPress={() => void override()}
                style={[styles.primary, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Unlock anyway</Text>
              </Pressable>
            )}
            {phase.attempt === 2 && (
              <Pressable accessibilityRole="button" onPress={() => setPhase({ kind: 'quiz', attempt: 3 })}>
                <Text style={[styles.quiet, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                  Keep trying
                </Text>
              </Pressable>
            )}
          </>
        )}

        {phase.kind === 'success' && (
          <>
            <Text style={[styles.accuracy, { color: colors.gold, fontFamily: fonts?.scripture }]}>
              {Math.round(phase.accuracy * 100)}%
            </Text>
            <Text style={[styles.body, { color: colors.ink, fontFamily: fonts?.ui }]}>
              The Word remains in you. Carry on.
            </Text>
          </>
        )}
      </ScrollView>

      {(phase.kind === 'quiz' || phase.kind === 'error') && (
        <Pressable accessibilityRole="button" onPress={() => void override()} style={styles.override}>
          <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Override
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxxl, gap: spacing.sm },
  body: { fontSize: 16, lineHeight: 22, marginTop: spacing.lg },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  primary: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  quiet: { fontSize: 15, textAlign: 'center', marginTop: spacing.lg },
  override: { paddingBottom: spacing.xxxl, alignItems: 'center' },
});
