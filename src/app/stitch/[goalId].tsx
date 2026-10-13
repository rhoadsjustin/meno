/**
 * Stitch session (docs/03 §5): recite from chunk 1 through the current
 * chunk as one long passage, Speak or Type, graded as one text (≥90%).
 */
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ScreenHeader } from '@/components/screen-header';
import { formatRange, getPassage } from '@/services/bible';
import { recordAttempt } from '@/services/db/repos/attempts';
import { getGoal } from '@/services/db/repos/goals';
import { recordStitchResult, stitchPlan, STITCH_PASS } from '@/services/db/repos/stitch';
import { secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import type { GradeResult } from '@/services/grading';
import { SpeakRound, type SpeakOutcome } from '@/features/practice/rounds/SpeakRound';
import { WordFeedback } from '@/features/practice/WordFeedback';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Phase =
  | { kind: 'loading' }
  | { kind: 'quiz' }
  | {
      kind: 'result';
      accuracy: number;
      passed: boolean;
      goalCompleted: boolean;
      result: GradeResult;
    }
  | { kind: 'error'; message: string };

export default function StitchRoute() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const colors = useThemeColors();
  const { sides } = useContentLayout();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [data, setData] = useState<{
    text: string;
    reference: string;
    translationId: string;
    chunkCount: number;
    lastChunkId: string;
    isFinal: boolean;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const goal = await getGoal(goalId);
        if (!goal) throw new Error('Goal not found');
        const plan = await stitchPlan(goalId);
        if (plan.chunks.length < 2) throw new Error('Nothing to stitch yet');
        const first = plan.chunks[0];
        const last = plan.chunks[plan.chunks.length - 1];
        const range = {
          start: {
            bookId: first.startBookId,
            chapter: first.startChapter,
            verse: first.startVerse,
          },
          end: { bookId: last.endBookId, chapter: last.endChapter, verse: last.endVerse },
        };
        const verses = await getPassage(goal.translationId, range);
        setData({
          text: verses.map((v) => v.text).join(' '),
          reference: formatRange(range),
          translationId: goal.translationId,
          chunkCount: plan.chunks.length,
          lastChunkId: last.id,
          isFinal: plan.isFinal,
        });
        setPhase({ kind: 'quiz' });
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [goalId]);

  const onDone = useCallback(
    async (outcome: SpeakOutcome) => {
      if (!data) return;
      const passed = outcome.accuracy >= STITCH_PASS;
      await recordAttempt({
        chunkId: data.lastChunkId,
        mode: outcome.typed ? 'type' : 'speak',
        accuracy: outcome.accuracy,
        durationMs: 0,
        missedWords: outcome.missedWords,
        // Not 'practice': this accuracy is for every chunk from the first
        // through this one, so it must not be read as a score for the last
        // chunk alone (repos/goals masteryDays).
        source: 'stitch',
      });
      const { goalCompleted } = passed
        ? await recordStitchResult(goalId, outcome.accuracy, data.chunkCount, data.isFinal)
        : { goalCompleted: false };
      if ((await secureToday()).daySecured) void rescheduleAll();
      void Haptics.notificationAsync(
        passed
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      setPhase({
        kind: 'result',
        accuracy: outcome.accuracy,
        passed,
        goalCompleted,
        result: outcome.result,
      });
    },
    [data, goalId],
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {/* Native bar: Close, titled Stitch. */}
      <ScreenHeader backHidden title="Stitch">
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="xmark"
            accessibilityLabel="Close"
            onPress={() => router.back()}>
            Close
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, contentColumn]}
          keyboardShouldPersistTaps="handled">
          {phase.kind === 'error' && (
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {phase.message}
            </Text>
          )}

          {phase.kind === 'quiz' && data && (
            <>
              <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Stitch it together — recite everything you’ve learned so far as one passage.
              </Text>
              <SpeakRound
                text={data.text}
                reference={data.reference}
                translationId={data.translationId}
                onDone={(o) => void onDone(o)}
              />
            </>
          )}

          {phase.kind === 'result' && (
            <>
              <Text
                style={[
                  styles.accuracy,
                  {
                    color: phase.goalCompleted
                      ? colors.gold
                      : phase.passed
                        ? colors.success
                        : colors.error,
                    fontFamily: fonts?.scripture,
                  },
                ]}>
                {Math.round(phase.accuracy * 100)}%
              </Text>
              <Text
                style={[
                  styles.heading,
                  { color: phase.goalCompleted ? colors.gold : colors.ink, fontFamily: fonts?.ui },
                ]}>
                {phase.goalCompleted
                  ? 'The whole passage is hidden in your heart.'
                  : phase.passed
                    ? 'Stitched — it holds together.'
                    : 'A few seams slipped — they’re marked below.'}
              </Text>
              <WordFeedback result={phase.result} />
              <Pressable
                accessibilityRole="button"
                onPress={() => (phase.passed ? router.back() : setPhase({ kind: 'quiz' }))}
                style={[styles.primary, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
                  {phase.passed ? 'Done' : 'Try again'}
                </Text>
              </Pressable>
              {!phase.passed && (
                <Pressable accessibilityRole="button" onPress={() => router.back()}>
                  <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    Later
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxxl, gap: spacing.sm },
  body: { fontSize: 15, lineHeight: 21 },
  heading: { fontSize: 20, fontWeight: '600', marginVertical: spacing.md },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  primary: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  quiet: { fontSize: 15, textAlign: 'center', marginTop: spacing.lg },
});
