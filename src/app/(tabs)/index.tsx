import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { formatRange, getPassage, getTranslation } from '@/services/bible';
import {
  activeGoal,
  chunkProgressLabel,
  chunksForGoal,
  currentChunk,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { countDueReviews } from '@/services/db/repos/reviews';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { firstLetters } from '@/services/practice';
import type { StreakDisplay } from '@/services/streaks';
import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

type TodayData = {
  goal: Goal;
  chunk: Chunk | null;
  chunkText: string;
  totalChunks: number;
};

/** Dissolution level for the hero card (07 §1): the text thins as the tier
 * climbs — full → first letters → reference only. */
function dissolve(text: string, tier: number): { display: string; mono: boolean } {
  if (tier >= 6) return { display: '', mono: false };
  if (tier >= 3) return { display: firstLetters(text), mono: true };
  return { display: text, mono: false };
}

export default function TodayScreen() {
  const colors = useThemeColors();
  const [data, setData] = useState<TodayData | null>(null);
  const [streak, setStreak] = useState<StreakDisplay | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const goal = await activeGoal();
        const streakNow = await currentStreakDisplay();
        const due = await countDueReviews();
        if (!cancelled) setDueCount(due);
        if (!goal) {
          if (!cancelled) {
            setData(null);
            setStreak(streakNow);
            setLoaded(true);
          }
          return;
        }
        const [chunk, chunks] = await Promise.all([currentChunk(goal.id), chunksForGoal(goal.id)]);
        let chunkText = '';
        if (chunk) {
          const verses = await getPassage(goal.translationId, {
            start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
            end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
          });
          chunkText = verses.map((v) => v.text).join(' ');
        }
        if (!cancelled) {
          setData({ goal, chunk: chunk ?? null, chunkText, totalChunks: chunks.length });
          setStreak(streakNow);
          setLoaded(true);
        }
      })().catch(() => setLoaded(true));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const ember = streak && streak.current > 0 && (
    <Text
      accessibilityLabel={`${streak.current} day streak${streak.activeToday ? ', secured today' : ''}`}
      style={[
        styles.ember,
        { color: streak.activeToday ? colors.lapis : colors.inkFaint, fontFamily: fonts?.ui },
      ]}>
      🔥 {streak.current}
    </Text>
  );

  return (
    <Screen title="Today" accessory={ember || undefined}>
      {loaded && !data && (
        <Card>
          <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            Nothing memorized yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Pick a passage to begin hiding it in your heart.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goal-wizard')}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>Start a goal</Text>
          </Pressable>
        </Card>
      )}

      {data && data.chunk && (
        <Card>
          {(() => {
            const { display, mono } = dissolve(data.chunkText, data.chunk.tier);
            return display ? (
              <Text
                accessibilityLabel={`Current passage, ${chunkRangeLabel(data.chunk)}`}
                style={[
                  styles.scripture,
                  mono
                    ? { fontFamily: fonts?.mono, fontSize: 17, lineHeight: 28 }
                    : { fontFamily: fonts?.scripture },
                  { color: colors.ink },
                ]}>
                {display}
              </Text>
            ) : (
              <Text style={[styles.scripture, { color: colors.gold, fontFamily: fonts?.scripture }]}>
                {chunkRangeLabel(data.chunk)}
              </Text>
            );
          })()}
          <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {chunkRangeLabel(data.chunk)} · {getTranslation(data.goal.translationId).abbrev}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/practice/${data.goal.id}`)}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>Practice</Text>
          </Pressable>
          <Text style={[styles.subline, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {chunkProgressLabel(data.chunk, data.totalChunks)}
          </Text>
        </Card>
      )}

      {data && !data.chunk && (
        <Card>
          <Text style={[styles.emptyTitle, { color: colors.gold, fontFamily: fonts?.ui }]}>
            {data.goal.title} — memorized
          </Text>
          <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Every chunk is hidden in your heart. Start another passage?
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goal-wizard')}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>New goal</Text>
          </Pressable>
        </Card>
      )}

      {dueCount > 0 && (
        <Card>
          <Pressable accessibilityRole="button" onPress={() => router.push('/review')}>
            <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Due for review
            </Text>
            <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {dueCount} {dueCount === 1 ? 'verse is' : 'verses are'} ready to be kept fresh.
            </Text>
            <Text style={[styles.reviewLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              Review {dueCount}
            </Text>
          </Pressable>
        </Card>
      )}

      {data && (
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push(
              `/reader/${data.goal.startBookId}.${data.chunk?.startChapter ?? data.goal.startChapter}.1?translation=${data.goal.translationId}`
            )
          }>
          <Text style={[styles.readingLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            Continue reading {formatRange({
              start: { bookId: data.goal.startBookId, chapter: data.goal.startChapter, verse: data.goal.startVerse },
              end: { bookId: data.goal.endBookId, chapter: data.goal.endChapter, verse: data.goal.endVerse },
            })}
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

function chunkRangeLabel(chunk: Chunk): string {
  return formatRange({
    start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
    end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
  });
}

const styles = StyleSheet.create({
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  emptyBody: { fontSize: 15, lineHeight: 20 },
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  attribution: { fontSize: 13, marginTop: spacing.md },
  subline: { fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  primaryButton: {
    marginTop: spacing.lg,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  readingLink: { fontSize: 15, paddingHorizontal: spacing.xs },
  reviewLink: { fontSize: 15, fontWeight: '600', marginTop: spacing.md },
  ember: { fontSize: 17, fontWeight: '600' },
});
