/**
 * Review session (docs/03 §6): serves the most-overdue memorized chunks,
 * grades a recall round each, and feeds results back into SM-2.
 * Speak alternation arrives with the speech tier; recall is typed for now.
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
import { db, tables } from '@/services/db';
import { recordAttempt } from '@/services/db/repos/attempts';
import { dueReviewItems, recordReviewResult, type ReviewItem } from '@/services/db/repos/reviews';
import { secureToday } from '@/services/db/repos/streaks';
import type { GradeResult } from '@/services/grading';
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
  /** Review mode alternates Speak/Type (docs/03 §6). */
  mode: 'type' | 'speak';
};

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'round'; index: number }
  | { kind: 'feedback'; index: number; accuracy: number; result: GradeResult }
  | { kind: 'summary'; reviewed: number; averageAccuracy: number };

export function ReviewSession() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
            start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
            end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
          };
          const verses = await getPassage(translationId, range);
          entries.push({
            item,
            chunkId: chunk.id,
            reference: formatRange(range),
            text: verses.map((v) => v.text).join(' '),
            translationId,
            mode: entries.length % 2 === 0 ? 'speak' : 'type',
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
    async (index: number, outcome: { accuracy: number; missedWords: string[]; result: GradeResult }) => {
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
      await secureToday();
      setAccuracies((a) => [...a, outcome.accuracy]);
      void Haptics.notificationAsync(
        outcome.accuracy >= 0.9
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      setPhase({ kind: 'feedback', index, accuracy: outcome.accuracy, result: outcome.result });
    },
    [queue, startedAt]
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

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.close, { color: colors.inkFaint }]}>✕</Text>
        </Pressable>
        {queue.length > 0 && phase.kind !== 'summary' && (
          <Text style={[styles.progress, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {phase.kind === 'round' || phase.kind === 'feedback'
              ? `${Math.min(phase.index + 1, queue.length)} of ${queue.length}`
              : ''}
          </Text>
        )}
        <View style={styles.closeSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {phase.kind === 'empty' && (
            <>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                Nothing due for review
              </Text>
              <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Memorized verses come back here as their review dates arrive.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Done</Text>
              </Pressable>
            </>
          )}

          {phase.kind === 'round' && queue[phase.index] && (
            <>
              <Text style={[styles.reference, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Review · {queue[phase.index].reference}
              </Text>
              {queue[phase.index].mode === 'speak' ? (
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
                style={[
                  styles.accuracy,
                  { color: phase.accuracy >= 0.9 ? colors.success : colors.error, fontFamily: fonts?.scripture },
                ]}>
                {Math.round(phase.accuracy * 100)}%
              </Text>
              <WordFeedback result={phase.result} />
              <Pressable accessibilityRole="button" onPress={advance} style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Continue</Text>
              </Pressable>
            </>
          )}

          {phase.kind === 'summary' && (
            <>
              <Text style={[styles.accuracy, { color: colors.lapis, fontFamily: fonts?.scripture }]}>
                {Math.round(phase.averageAccuracy * 100)}%
              </Text>
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {phase.reviewed} {phase.reviewed === 1 ? 'verse' : 'verses'} kept fresh
              </Text>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.lapis }]}>
                <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>Done</Text>
              </Pressable>
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
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.sm,
  },
  close: { fontSize: 20 },
  closeSpacer: { width: 20 },
  progress: { fontSize: 14 },
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
