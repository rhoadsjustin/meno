import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { formatRange, getPassage, getTranslation } from '@/services/bible';
import {
  activeGoal,
  chunkProgressLabel,
  chunksForGoal,
  currentChunk,
  listActiveGoals,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { countDueReviews } from '@/services/db/repos/reviews';
import { stitchPlan } from '@/services/db/repos/stitch';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { firstLetters } from '@/services/practice';
import type { StreakDisplay } from '@/services/streaks';
import { showGoalOnWidgets } from '@/services/widgets';
import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

/** Where one passage in progress stands. */
type GoalProgress = {
  goal: Goal;
  chunk: Chunk | null;
  totalChunks: number;
  stitchDue: boolean;
};

/** The focus passage (the one on the widgets) gets the hero card and its text. */
type TodayData = GoalProgress & { chunkText: string };

async function progressFor(goal: Goal): Promise<GoalProgress> {
  const [chunk, chunks, stitch] = await Promise.all([
    currentChunk(goal.id),
    chunksForGoal(goal.id),
    stitchPlan(goal.id),
  ]);
  return { goal, chunk: chunk ?? null, totalChunks: chunks.length, stitchDue: stitch.due };
}

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
  const [others, setOthers] = useState<GoalProgress[]>([]);
  const [streak, setStreak] = useState<StreakDisplay | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reads everything this screen shows; `isCancelled` guards a blurred screen.
  const load = useCallback(async (isCancelled: () => boolean) => {
    const [goal, goals] = await Promise.all([activeGoal(), listActiveGoals()]);
    // First launch: run onboarding before anything else.
    if (!goal) {
      const { onboardingDone } = await import('@/services/db/repos/appFlags');
      if (!(await onboardingDone()) && !isCancelled()) {
        router.push('/onboarding');
        setLoaded(true);
        return;
      }
    }
    const streakNow = await currentStreakDisplay();
    const due = await countDueReviews();
    if (!isCancelled()) setDueCount(due);
    if (!goal) {
      if (!isCancelled()) {
        setData(null);
        setOthers([]);
        setStreak(streakNow);
        setLoaded(true);
      }
      return;
    }
    const [focus, rest] = await Promise.all([
      progressFor(goal),
      Promise.all(goals.filter((g) => g.id !== goal.id).map(progressFor)),
    ]);
    let chunkText = '';
    if (focus.chunk) {
      const c = focus.chunk;
      const verses = await getPassage(goal.translationId, {
        start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
        end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
      });
      chunkText = verses.map((v) => v.text).join(' ');
    }
    if (!isCancelled()) {
      setData({ ...focus, chunkText });
      setOthers(rest);
      setStreak(streakNow);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load(() => cancelled).catch(() => setLoaded(true));
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const showOnWidgets = useCallback(async (goal: Goal) => {
    void Haptics.selectionAsync();
    try {
      await showGoalOnWidgets(goal.id);
      AccessibilityInfo.announceForAccessibility(`${goal.title} is now on your widgets.`);
    } finally {
      await load(() => false);
    }
  }, [load]);

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

  // Only worth saying which passage is on the widgets once there's a choice.
  const focusLabel = others.length > 0 && (
    <Text style={[styles.focusLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
      On your widgets
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
          {focusLabel}
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
          {focusLabel}
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

      {data?.stitchDue && (
        <Card>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/stitch/${data.goal.id}`)}>
            <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Stitch it together
            </Text>
            <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Recite everything you’ve learned so far as one passage.
            </Text>
            <Text style={[styles.reviewLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              Begin stitch
            </Text>
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

      {others.length > 0 && (
        <>
          <Text
            accessibilityRole="header"
            style={[styles.sectionHeader, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Also practicing
          </Text>
          {others.map((o) => (
            <Card key={o.goal.id}>
              <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {o.goal.title}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {o.chunk
                  ? `${chunkRangeLabel(o.chunk)} · ${chunkProgressLabel(o.chunk, o.totalChunks)}`
                  : 'Every chunk memorized'}
              </Text>
              <View style={styles.otherActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${o.stitchDue ? 'Stitch' : 'Practice'} ${o.goal.title}`}
                  onPress={() =>
                    router.push(o.stitchDue ? `/stitch/${o.goal.id}` : `/practice/${o.goal.id}`)
                  }
                  style={[styles.smallButton, { backgroundColor: colors.lapis }]}>
                  <Text style={[styles.smallButtonText, { fontFamily: fonts?.ui }]}>
                    {o.stitchDue ? 'Stitch' : 'Practice'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${o.goal.title} on your widgets`}
                  hitSlop={8}
                  onPress={() => void showOnWidgets(o.goal)}>
                  <Text style={[styles.textAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                    Show on widgets
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </>
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

      {data && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/goal-wizard')}>
          <Text style={[styles.readingLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            + Practice another passage
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
  focusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  otherActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  smallButton: {
    borderRadius: radius.capsule,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  smallButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  textAction: { fontSize: 15, fontWeight: '600' },
});
