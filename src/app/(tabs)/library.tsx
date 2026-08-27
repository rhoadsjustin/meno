import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { formatRange, getTranslation } from '@/services/bible';
import { chunksForGoal, listGoals, type Chunk, type Goal } from '@/services/db/repos/goals';
import { itemHealth, reviewItemForChunk } from '@/services/db/repos/reviews';
import type { Health } from '@/services/scheduler';
import { useThemeColors, fonts, radius, spacing, type ThemeColors } from '@/theme';

type Segment = 'inProgress' | 'memorized';
type GoalWithChunks = { goal: Goal; chunks: Chunk[] };

export default function LibraryScreen() {
  const colors = useThemeColors();
  const [segment, setSegment] = useState<Segment>('inProgress');
  const [items, setItems] = useState<GoalWithChunks[]>([]);
  const [healthByChunk, setHealthByChunk] = useState<Record<string, Health>>({});
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const goals = await listGoals();
        const withChunks = await Promise.all(
          goals.map(async (goal) => ({ goal, chunks: await chunksForGoal(goal.id) }))
        );
        const health: Record<string, Health> = {};
        for (const { chunks } of withChunks) {
          for (const c of chunks.filter((c) => c.status === 'memorized')) {
            const item = await reviewItemForChunk(c.id);
            if (item) health[c.id] = itemHealth(item);
          }
        }
        if (!cancelled) {
          setItems(withChunks);
          setHealthByChunk(health);
          setLoaded(true);
        }
      })().catch(() => setLoaded(true));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const memorizedChunks = items.flatMap(({ goal, chunks }) =>
    chunks.filter((c) => c.status === 'memorized').map((c) => ({ goal, chunk: c }))
  );

  return (
    <Screen title="Library">
      <View style={[styles.segmented, { backgroundColor: colors.lapisWash }]}>
        {(
          [
            ['inProgress', 'In progress'],
            ['memorized', 'Memorized'],
          ] as const
        ).map(([value, label]) => {
          const selected = segment === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setSegment(value)}
              style={[styles.segment, selected && { backgroundColor: colors.surfaceRaised }]}>
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? colors.ink : colors.inkFaint, fontFamily: fonts?.ui },
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {segment === 'inProgress' && (
        <>
          {items
            .filter(({ goal }) => goal.status === 'active')
            .map(({ goal, chunks }) => (
              <Card key={goal.id}>
                <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                  {goal.title}
                </Text>
                <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {getTranslation(goal.translationId).abbrev} ·{' '}
                  {chunks.filter((c) => c.status === 'memorized').length} of {chunks.length} chunks
                  memorized
                </Text>
                <View style={styles.heatmap} accessibilityLabel={`Chunk progress for ${goal.title}`}>
                  {chunks.map((c) => (
                    <View
                      key={c.id}
                      style={[styles.cell, { backgroundColor: cellColor(c, colors) }]}
                    />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/practice/${goal.id}`)}
                  style={[styles.practiceLink]}>
                  <Text style={[styles.practiceLinkText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                    Practice
                  </Text>
                </Pressable>
              </Card>
            ))}
          {loaded && items.filter(({ goal }) => goal.status === 'active').length === 0 && (
            <Card>
              <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                No goals yet
              </Text>
              <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Your passages in progress will live here.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/goal-wizard')}
                style={styles.practiceLink}>
                <Text style={[styles.practiceLinkText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                  Start a goal
                </Text>
              </Pressable>
            </Card>
          )}
        </>
      )}

      {segment === 'memorized' && (
        <>
          {memorizedChunks.map(({ goal, chunk }) => (
            <Card key={chunk.id}>
              <View style={styles.memorizedRow}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: healthColor(healthByChunk[chunk.id] ?? 'fresh', colors) },
                  ]}
                />
                <View style={styles.memorizedText}>
                  <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                    {formatRange({
                      start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
                      end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
                    })}
                  </Text>
                  <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {getTranslation(goal.translationId).abbrev} ·{' '}
                    {healthLabel(healthByChunk[chunk.id] ?? 'fresh')}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
          {loaded && memorizedChunks.length === 0 && (
            <Card>
              <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                Nothing memorized yet
              </Text>
              <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Chunks you’ve fully hidden in your heart appear here, with their health.
              </Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

/** Health dot: fresh lapis / fading inkFaint / at-risk error (07 §6). */
function healthColor(health: Health, colors: ThemeColors): string {
  return health === 'fresh' ? colors.lapis : health === 'fading' ? colors.inkFaint : colors.error;
}

function healthLabel(health: Health): string {
  return health === 'fresh' ? 'fresh' : health === 'fading' ? 'fading' : 'at risk';
}

/** lapisWash → lapis by tier; gold when memorized (docs/07 §6). */
function cellColor(chunk: Chunk, colors: ThemeColors): string {
  if (chunk.status === 'memorized') return colors.gold;
  if (chunk.status === 'locked') return colors.separator;
  const t = Math.min(chunk.tier, 5) / 5;
  // Blend lapisWash → lapis in 6 steps via opacity layering approximation.
  return t < 0.2 ? colors.lapisWash : t < 0.6 ? `${colors.lapis}88` : colors.lapis;
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.capsule,
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: radius.capsule,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentText: { fontSize: 15, fontWeight: '600' },
  goalTitle: { fontSize: 17, fontWeight: '600' },
  goalSub: { fontSize: 13, marginTop: spacing.xs },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  cell: { width: 16, height: 16, borderRadius: 4 },
  practiceLink: { marginTop: spacing.md, alignSelf: 'flex-start' },
  practiceLinkText: { fontSize: 15, fontWeight: '600' },
  memorizedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  memorizedText: { flex: 1 },
});
