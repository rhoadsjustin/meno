/**
 * Review session (docs/03 §6): serves the most-overdue memorized chunks,
 * grades a recall round each, and feeds results back into SM-2.
 * Speak alternation arrives with the speech tier; recall is typed for now.
 */
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { KeyboardScroll } from '@/components/keyboard-scroll';
import { ScreenHeader } from '@/components/screen-header';
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
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';
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
  | { kind: 'round'; index: number }
  | { kind: 'feedback'; index: number; accuracy: number; result: GradeResult }
  | { kind: 'summary'; reviewed: number; averageAccuracy: number };

export function ReviewSession() {
  const colors = useThemeColors();
  const { sides } = useContentLayout();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [accuracies, setAccuracies] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
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
        setQueue(entries);
        setPhase(entries.length === 0 ? { kind: 'empty' } : { kind: 'round', index: 0 });
        setStartedAt(Date.now());
      } catch {
        setPhase({ kind: 'empty' });
      }
    })();
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
      await recordReviewResult(entry.item, outcome.accuracy);
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
        reviewed: all.length,
        averageAccuracy: all.length ? all.reduce((s, a) => s + a, 0) / all.length : 0,
      });
    }
  }, [phase, queue.length, accuracies]);

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
            ? `${Math.min(phase.index + 1, queue.length)} of ${queue.length}`
            : 'Review'
        }>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="xmark"
            accessibilityLabel="Close review"
            onPress={() => router.back()}>
            Close
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <View style={styles.flex}>
        <KeyboardScroll contentContainerStyle={[styles.content, contentColumn]}>
          {phase.kind === 'empty' && (
            <>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                Nothing due for review
              </Text>
              <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Memorized verses come back here as their review dates arrive.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Done</Text>
              </Pressable>
            </>
          )}

          {phase.kind === 'round' && queue[phase.index] && (
            <>
              <Text style={[styles.reference, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Review · {queue[phase.index].reference}
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
                  onDone={(o) => void finishRound(phase.index, o)}
                />
              )}
            </>
          )}

          {phase.kind === 'feedback' && (
            <>
              <Text
                accessibilityLabel={`Accuracy ${Math.round(phase.accuracy * 100)} percent`}
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
                {Math.round(phase.accuracy * 100)}%
              </Text>
              {tone === 'almost' && (
                <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                  {phase.result.words.length > 0
                    ? 'Almost — the slipped words are marked below'
                    : 'Almost'}
                </Text>
              )}
              <WordFeedback result={phase.result} tone={tone === 'almost' ? 'almost' : 'error'} />
              <Pressable
                accessibilityRole="button"
                onPress={advance}
                style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Continue</Text>
              </Pressable>
            </>
          )}

          {phase.kind === 'summary' && (
            <>
              <Text
                style={[styles.accuracy, { color: colors.lapis, fontFamily: fonts?.scripture }]}>
                {Math.round(phase.averageAccuracy * 100)}%
              </Text>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {phase.reviewed} {phase.reviewed === 1 ? 'verse' : 'verses'} kept fresh
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Done</Text>
              </Pressable>
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
  body: { fontSize: 15, lineHeight: 20 },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  button: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
