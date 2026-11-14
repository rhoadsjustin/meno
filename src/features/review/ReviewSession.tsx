/**
 * Review session (docs/03 §6): serves the most-overdue memorized chunks,
 * grades a recall round each, and feeds results back into SM-2.
 * Speak alternation arrives with the speech tier; recall is typed for now.
 */
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
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
import { formatRange, getPassage } from '@/services/bible';
import { db, tables } from '@/services/db';
import { recordAttempt } from '@/services/db/repos/attempts';
import { dueReviewItems, recordReviewResult, type ReviewItem } from '@/services/db/repos/reviews';
import { secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import { gradeBandAtLine, type GradeResult } from '@/services/grading';
import { BlanksRound } from '@/features/practice/rounds/BlanksRound';
import { SpeakRound } from '@/features/practice/rounds/SpeakRound';
import { TypeRound } from '@/features/practice/rounds/TypeRound';
import { WordFeedback } from '@/features/practice/WordFeedback';
import { useThemeColors, fonts, layout, spacing } from '@/theme';
import { eq } from 'drizzle-orm';

type QueueEntry = {
  item: ReviewItem;
  chunkId: string;
  reference: string;
  text: string;
  translationId: string;
  /** Alternates Speak/Type; every 4th successful review of a chunk drops to
   * Blanks 75 to keep sessions short (docs/03 §6). */
  mode: 'type' | 'speak' | 'blanks75';
};

/** A review reads as kept at this accuracy; the colour only, SM-2 is fed the score itself. */
const REVIEW_PASS = 0.9;


type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  /** The queue or a passage's text could not be read: not the same as nothing due. */
  | { kind: 'failed' }
  | { kind: 'round'; index: number }
  | { kind: 'feedback'; index: number; accuracy: number; result: GradeResult }
  | { kind: 'summary'; held: number; reset: number; averageAccuracy: number };

export function ReviewSession() {
  const colors = useThemeColors();
  const { t } = useTranslation(['review', 'practice', 'common']);
  const closeIcon = useBarIcon('xmark', 'close');
  const { sides } = useContentLayout();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [accuracies, setAccuracies] = useState<number[]>([]);
  // Reviews that held (SM-2 quality 3+); the rest were reset to tomorrow.
  const [heldCount, setHeldCount] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  // Bumped by Try again to read the queue once more.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await dueReviewItems();
        const entries: QueueEntry[] = [];
        for (const item of items) {
          const chunkRows = await db
            .select()
            .from(tables.chunks)
            .where(eq(tables.chunks.id, item.chunkId))
            .limit(1);
          const chunk = chunkRows[0];
          if (!chunk) continue;
          const goalRows = await db
            .select({ translationId: tables.goals.translationId })
            .from(tables.goals)
            .where(eq(tables.goals.id, chunk.goalId))
            .limit(1);
          const translationId = goalRows[0]?.translationId ?? 'web';
          const range = {
            start: {
              bookId: chunk.startBookId,
              chapter: chunk.startChapter,
              verse: chunk.startVerse,
            },
            end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
          };
          const verses = await getPassage(translationId, range);
          entries.push({
            item,
            chunkId: chunk.id,
            reference: formatRange(range),
            text: verses.map((v) => v.text).join(' '),
            translationId,
            mode:
              item.repetitions > 0 && item.repetitions % 4 === 3
                ? 'blanks75'
                : entries.length % 2 === 0
                  ? 'speak'
                  : 'type',
          });
        }
        if (cancelled) return;
        setQueue(entries);
        setPhase(entries.length === 0 ? { kind: 'empty' } : { kind: 'round', index: 0 });
        setStartedAt(Date.now());
      } catch {
        // A due review hidden behind "Nothing due" would be a false statement.
        if (!cancelled) setPhase({ kind: 'failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retryLoad = useCallback(() => {
    setPhase({ kind: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const finishRound = useCallback(
    async (
      index: number,
      outcome: { accuracy: number; missedWords: string[]; result: GradeResult },
    ) => {
      const entry = queue[index];
      await recordAttempt({
        chunkId: entry.chunkId,
        mode: entry.mode,
        accuracy: outcome.accuracy,
        durationMs: Date.now() - startedAt,
        missedWords: outcome.missedWords,
        source: 'review',
      });
      const held = await recordReviewResult(entry.item, outcome.accuracy);
      if (held) setHeldCount((n) => n + 1);
      if ((await secureToday()).daySecured) void rescheduleAll();
      const { refreshBadges } = await import('@/services/db/repos/badges');
      void refreshBadges();
      setAccuracies((a) => [...a, outcome.accuracy]);
      void Haptics.notificationAsync(
        outcome.accuracy >= REVIEW_PASS
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      setPhase({ kind: 'feedback', index, accuracy: outcome.accuracy, result: outcome.result });
    },
    [queue, startedAt],
  );

  const advance = useCallback(() => {
    if (phase.kind !== 'feedback') return;
    const next = phase.index + 1;
    if (next < queue.length) {
      setPhase({ kind: 'round', index: next });
      setStartedAt(Date.now());
    } else {
      const all = accuracies;
      setPhase({
        kind: 'summary',
        held: heldCount,
        reset: all.length - heldCount,
        averageAccuracy: all.length ? all.reduce((s, a) => s + a, 0) / all.length : 0,
      });
    }
  }, [phase, queue.length, accuracies, heldCount]);

  const tone =
    // The pass line is where it has always been; beneath it the ladder's
    // almost band reads amber rather than error red (docs/03 §3). Display
    // only — SM-2 was already fed the honest accuracy in `finishRound`.
    phase.kind === 'feedback'
      ? gradeBandAtLine(REVIEW_PASS, phase.accuracy, phase.result.unitCount)
      : null;

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {/* Native bar: Close, with the queue position as the title. */}
      <ScreenHeader
        backHidden
        title={
          queue.length > 0 && (phase.kind === 'round' || phase.kind === 'feedback')
            ? t('position', { index: Math.min(phase.index + 1, queue.length), total: queue.length })
            : t('title')
        }>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={closeIcon}
            accessibilityLabel={t('closeLabel')}
            onPress={closeModal}>
            {t('common:close')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <View style={styles.flex}>
        <KeyboardScroll contentContainerStyle={[styles.content, contentColumn]}>
          {/* Blank for a moment, then a spinner: licensed text is fetched. */}
          {phase.kind === 'loading' && <LoadingState layout="inline" />}

          {phase.kind === 'empty' && (
            <Unavailable
              kind="empty"
              symbol={{ ios: 'checkmark.circle', android: 'check_circle' }}
              title={t('emptyTitle')}
              message={t('emptyBody')}
              action={{ label: t('common:done'), onPress: closeModal }}
            />
          )}

          {phase.kind === 'failed' && (
            <Unavailable
              kind="failed"
              title={t('loadFailedTitle')}
              message={t('loadFailedBody')}
              action={{ label: t('common:retry'), onPress: retryLoad }}
              secondaryAction={{ label: t('common:done'), onPress: closeModal }}
            />
          )}

          {phase.kind === 'round' && queue[phase.index] && (
            <>
              <Text style={[styles.reference, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t('roundHeader', { reference: queue[phase.index].reference })}
              </Text>
              {queue[phase.index].mode === 'blanks75' ? (
                <BlanksRound
                  key={phase.index}
                  text={queue[phase.index].text}
                  density={0.75}
                  chunkId={queue[phase.index].chunkId}
                  attemptNo={phase.index}
                  onDone={(o) =>
                    void finishRound(phase.index, {
                      accuracy: o.accuracy,
                      missedWords: o.missedWords,
                      result: {
                        words: [],
                        insertions: [],
                        accuracy: o.accuracy,
                        unitCount: o.unitCount,
                      },
                    })
                  }
                />
              ) : queue[phase.index].mode === 'speak' ? (
                <SpeakRound
                  key={phase.index}
                  text={queue[phase.index].text}
                  reference={queue[phase.index].reference}
                  translationId={queue[phase.index].translationId}
                  onDone={(o) => void finishRound(phase.index, o)}
                />
              ) : (
                <TypeRound
                  key={phase.index}
                  text={queue[phase.index].text}
                  reference={queue[phase.index].reference}
                  translationId={queue[phase.index].translationId}
                  onDone={(o) => void finishRound(phase.index, o)}
                />
              )}
            </>
          )}

          {phase.kind === 'feedback' && (
            <>
              <Text
                accessibilityLabel={t('practice:feedback.accuracyLabel', {
                  value: Math.round(phase.accuracy * 100),
                })}
                style={[
                  styles.accuracy,
                  {
                    color:
                      tone === 'pass'
                        ? colors.success
                        : tone === 'almost'
                          ? colors.amber
                          : colors.error,
                    fontFamily: fonts?.scripture,
                  },
                ]}>
                {t('common:percent', { value: Math.round(phase.accuracy * 100) })}
              </Text>
              {tone === 'almost' && (
                <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                  {phase.result.words.length > 0 ? t('almostMarked') : t('almost')}
                </Text>
              )}
              <WordFeedback result={phase.result} tone={tone === 'almost' ? 'almost' : 'error'} />
              <Button
                label={t('common:continue')}
                onPress={advance}
                style={styles.button}
              />
            </>
          )}

          {phase.kind === 'summary' && (
            <>
              <Text
                style={[styles.accuracy, { color: colors.lapis, fontFamily: fonts?.scripture }]}>
                {t('common:percent', { value: Math.round(phase.averageAccuracy * 100) })}
              </Text>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {t('keptFresh', { count: phase.held })}
              </Text>
              {phase.reset > 0 && (
                <Text style={[styles.summaryNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {t('comeBack', { count: phase.reset })}
                </Text>
              )}
              <Button
                label={t('common:done')}
                onPress={closeModal}
                style={styles.button}
              />
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
  reference: { fontSize: 14, marginBottom: spacing.lg },
  heading: { fontSize: 20, fontWeight: '600', marginVertical: spacing.md },
  summaryNote: { fontSize: 15, lineHeight: 20, marginBottom: spacing.md },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  button: { marginTop: spacing.xxl },
});
