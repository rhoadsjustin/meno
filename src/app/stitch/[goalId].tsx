/**
 * Stitch session (docs/03 §5): recite from chunk 1 through the current
 * chunk as one long passage, Speak or Type, graded as one text (≥90%).
 */
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { KeyboardScroll } from '@/components/keyboard-scroll';
import { useBarIcon } from '@/components/bar-icon';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/button';
import { LoadingState, Unavailable } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import { formatRange, getPassage, loadFailureMessage } from '@/services/bible';
import { recordAttempt } from '@/services/db/repos/attempts';
import { getGoal } from '@/services/db/repos/goals';
import { recordStitchResult, stitchPlan, STITCH_PASS } from '@/services/db/repos/stitch';
import { secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import type { GradeResult } from '@/services/grading';
import { SpeakRound, type SpeakOutcome } from '@/features/practice/rounds/SpeakRound';
import { WordFeedback } from '@/features/practice/WordFeedback';
import { useThemeColors, fonts, layout, spacing } from '@/theme';

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
  /** No stitch to run. `failed` is a load that threw (retryable), `gone` a
   * goal that is no longer on the device, `nothingYet` too few chunks. */
  | { kind: 'unavailable'; reason: 'failed' | 'gone' | 'nothingYet'; message?: string };

export default function StitchRoute() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const colors = useThemeColors();
  const { t } = useTranslation(['stitch', 'common']);
  const closeIcon = useBarIcon('xmark', 'close');
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

  // Bumped by Try again to run the load once more.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Worded here, never from the thrown error (a provider's message is
    // developer English).
    let failure: string | undefined;
    void (async () => {
      try {
        const goal = await getGoal(goalId);
        if (cancelled) return;
        if (!goal) {
          setPhase({ kind: 'unavailable', reason: 'gone' });
          return;
        }
        const plan = await stitchPlan(goalId);
        if (cancelled) return;
        if (plan.chunks.length < 2) {
          setPhase({ kind: 'unavailable', reason: 'nothingYet' });
          return;
        }
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
        failure = loadFailureMessage(goal.translationId, formatRange(range));
        const verses = await getPassage(goal.translationId, range);
        if (cancelled) return;
        setData({
          text: verses.map((v) => v.text).join(' '),
          reference: formatRange(range),
          translationId: goal.translationId,
          chunkCount: plan.chunks.length,
          lastChunkId: last.id,
          isFinal: plan.isFinal,
        });
        setPhase({ kind: 'quiz' });
      } catch {
        if (!cancelled) setPhase({ kind: 'unavailable', reason: 'failed', message: failure });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId, attempt]);

  const retryLoad = useCallback(() => {
    setPhase({ kind: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

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
      <ScreenHeader backHidden title={t('title')}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={closeIcon}
            accessibilityLabel={t('common:close')}
            onPress={closeModal}>
            {t('common:close')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <View style={styles.flex}>
        <KeyboardScroll contentContainerStyle={[styles.content, contentColumn]}>
          {phase.kind === 'loading' && <LoadingState layout="inline" />}

          {phase.kind === 'unavailable' &&
            (phase.reason === 'nothingYet' ? (
              <Unavailable
                kind="empty"
                title={t('nothingYet')}
                message={t('nothingYetBody')}
                action={{ label: t('common:done'), onPress: closeModal }}
              />
            ) : phase.reason === 'gone' ? (
              <Unavailable
                kind="failed"
                title={t('common:passageUnavailable')}
                message={t('common:passageGone')}
                action={{ label: t('common:done'), onPress: closeModal }}
              />
            ) : (
              <Unavailable
                kind="failed"
                title={t('common:passageUnavailable')}
                message={phase.message ?? t('common:tryAgainSoon')}
                action={{ label: t('common:retry'), onPress: retryLoad }}
                secondaryAction={{ label: t('common:done'), onPress: closeModal }}
              />
            ))}

          {phase.kind === 'quiz' && data && (
            <>
              <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t('intro')}
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
                {t('common:percent', { value: Math.round(phase.accuracy * 100) })}
              </Text>
              <Text
                style={[
                  styles.heading,
                  { color: phase.goalCompleted ? colors.gold : colors.ink, fontFamily: fonts?.ui },
                ]}>
                {phase.goalCompleted
                  ? t('goalCompleted')
                  : phase.passed
                    ? t('passed')
                    : t('failed')}
              </Text>
              <WordFeedback result={phase.result} />
              <Button
                label={phase.passed ? t('common:done') : t('common:retry')}
                onPress={() => (phase.passed ? closeModal() : setPhase({ kind: 'quiz' }))}
                style={styles.primary}
              />
              {!phase.passed && (
                <Button
                  variant="plain"
                  label={t('later')}
                  onPress={closeModal}
                  style={styles.later}
                />
              )}
            </>
          )}
        </KeyboardScroll>
      </View>
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
  primary: { marginTop: spacing.xxl },
  // Same pair as practice's feedback: filled action, plain one under it.
  later: { marginTop: spacing.sm },
});
