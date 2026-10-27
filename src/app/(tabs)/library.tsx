import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import { DeleteGoalButton } from '@/features/goals/DeleteGoalButton';
import { removeGoal } from '@/features/goals/remove-goal';
import { formatRange, getTranslation } from '@/services/bible';
import { shareGoalChallenge } from '@/services/challenges';
import {
  activeGoal,
  chunksForGoal,
  listGoals,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { itemHealth, reviewItemForChunk } from '@/services/db/repos/reviews';
import { deleteGoalPrompt, mayDeleteGoal } from '@/services/goals/deletion';
import type { Health } from '@/services/scheduler';
import { showGoalOnWidgets } from '@/services/widgets';
import { useThemeColors, fonts, radius, spacing, type ThemeColors } from '@/theme';

type Segment = 'inProgress' | 'memorized';

/** From the accessibility text sizes up (the breakpoint StarterDeck stacks
 * at), the trash button leaves the title's line so the title keeps the
 * card's full width instead of breaking mid-word beside it. */
const BUTTON_BELOW_TEXT_SCALE = 1.4;
type GoalWithChunks = { goal: Goal; chunks: Chunk[] };

export default function LibraryScreen() {
  const colors = useThemeColors();
  // Wide windows (iPhone Duo opened, Split View) show both shelves side by
  // side — In progress on the left, Memorized on the right — instead of the
  // segmented control (HIG: show the next level of hierarchy when it fits).
  const { isWide } = useContentLayout();
  const buttonBelow = useWindowDimensions().fontScale >= BUTTON_BELOW_TEXT_SCALE;
  const [segment, setSegment] = useState<Segment>('inProgress');
  const [items, setItems] = useState<GoalWithChunks[]>([]);
  const [healthByChunk, setHealthByChunk] = useState<Record<string, Health>>({});
  const [loaded, setLoaded] = useState(false);
  // The passage on the widgets (services/focus).
  const [focusId, setFocusId] = useState<string | null>(null);

  // Reads everything this screen shows; `isCancelled` guards a blurred screen.
  const load = useCallback(async (isCancelled: () => boolean) => {
    const [goals, focus] = await Promise.all([listGoals(), activeGoal()]);
    const withChunks = await Promise.all(
      goals.map(async (goal) => ({ goal, chunks: await chunksForGoal(goal.id) })),
    );
    const health: Record<string, Health> = {};
    for (const { chunks } of withChunks) {
      for (const c of chunks.filter((c) => c.status === 'memorized')) {
        const item = await reviewItemForChunk(c.id);
        if (item) health[c.id] = itemHealth(item);
      }
    }
    if (!isCancelled()) {
      setItems(withChunks);
      setFocusId(focus?.id ?? null);
      setHealthByChunk(health);
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
    }, [load]),
  );

  const showOnWidgets = useCallback(
    async (goal: Goal) => {
      void Haptics.selectionAsync();
      try {
        await showGoalOnWidgets(goal.id);
        AccessibilityInfo.announceForAccessibility(`${goal.title} is now on your widgets.`);
      } finally {
        await load(() => false);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (goal: Goal) => {
      try {
        await removeGoal(goal.id);
        AccessibilityInfo.announceForAccessibility(`${goal.title} deleted.`);
      } catch {
        Alert.alert(`Couldn’t delete ${goal.title}`, 'Try again in a moment.');
      } finally {
        await load(() => false);
      }
    },
    [load],
  );

  /** The trash button, only on a passage in progress with nothing memorized
   * yet: memorized Scripture is never deleted (services/goals/deletion). */
  const deleteButton = (goal: Goal, chunks: Chunk[]) =>
    mayDeleteGoal(goal, chunks) ? (
      <DeleteGoalButton
        label={`Delete ${goal.title}`}
        tint={colors.inkFaint}
        prompt={deleteGoalPrompt(goal.title)}
        onDelete={() => void remove(goal)}
      />
    ) : null;

  const active = items.filter(({ goal }) => goal.status === 'active');
  // Only offer a choice once there is more than one passage in progress.
  const activeCount = active.length;

  const memorizedChunks = items.flatMap(({ goal, chunks }) =>
    chunks.filter((c) => c.status === 'memorized').map((c) => ({ goal, chunk: c })),
  );

  const header = (label: string) => (
    <Text
      accessibilityRole="header"
      style={[styles.shelfTitle, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
      {label}
    </Text>
  );

  const inProgress = (
    <>
      {active.length > 0 && (
        <View style={styles.stack}>
          {active.map(({ goal, chunks }) => (
            <Card key={goal.id}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.goalTitle,
                    styles.titleText,
                    { color: colors.ink, fontFamily: fonts?.ui },
                  ]}>
                  {goal.title}
                </Text>
                {!buttonBelow && deleteButton(goal, chunks)}
              </View>
              <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {getTranslation(goal.translationId).abbrev} ·{' '}
                {chunks.filter((c) => c.status === 'memorized').length} of {chunks.length} chunks
                memorized
              </Text>
              <View
                style={styles.heatmap}
                accessible
                accessibilityLabel={`Chunk progress for ${goal.title}: ${chunks.filter((c) => c.status === 'memorized').length} memorized, ${chunks.filter((c) => c.status === 'learning' || c.status === 'active').length} in progress, ${chunks.filter((c) => c.status === 'locked').length} not started`}>
                {chunks.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.cell, { backgroundColor: cellColor(c, colors) }]}
                  />
                ))}
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/practice/${goal.id}`)}
                  style={[styles.practiceLink]}>
                  <Text
                    style={[
                      styles.practiceLinkText,
                      { color: colors.lapis, fontFamily: fonts?.ui },
                    ]}>
                    Practice
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${goal.title} as a challenge`}
                  onPress={() => shareGoalChallenge(goal).catch(() => {})}
                  style={[styles.practiceLink]}>
                  <Text
                    style={[
                      styles.practiceLinkText,
                      { color: colors.lapis, fontFamily: fonts?.ui },
                    ]}>
                    Share challenge
                  </Text>
                </Pressable>
                {activeCount > 1 &&
                  (goal.id === focusId ? (
                    <Text
                      style={[
                        styles.practiceLink,
                        styles.focusNote,
                        { color: colors.inkFaint, fontFamily: fonts?.ui },
                      ]}>
                      On your widgets
                    </Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${goal.title} on your widgets`}
                      onPress={() => void showOnWidgets(goal)}
                      style={[styles.practiceLink]}>
                      <Text
                        style={[
                          styles.practiceLinkText,
                          { color: colors.lapis, fontFamily: fonts?.ui },
                        ]}>
                        Show on widgets
                      </Text>
                    </Pressable>
                  ))}
                {buttonBelow && mayDeleteGoal(goal, chunks) && (
                  <View style={styles.practiceLink}>{deleteButton(goal, chunks)}</View>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
      {loaded && active.length === 0 && (
        <Card>
          <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            No passages yet
          </Text>
          <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Your passages in progress will live here.
          </Text>
        </Card>
      )}
      {loaded && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/goal-wizard')}
          style={[styles.newGoal, { borderColor: colors.lapis }]}>
          <Text style={[styles.practiceLinkText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {active.length > 0 ? '+ Practice another passage' : 'Choose a passage'}
          </Text>
        </Pressable>
      )}
    </>
  );

  const memorized = (
    <>
      {memorizedChunks.length > 0 && (
        <View style={styles.stack}>
          {memorizedChunks.map(({ goal, chunk }) => (
            <Card key={chunk.id}>
              <View style={styles.memorizedRow}>
                <View
                  style={[
                    styles.healthDot,
                    {
                      backgroundColor: healthColor(healthByChunk[chunk.id] ?? 'fresh', colors),
                    },
                  ]}
                />
                <View style={styles.memorizedText}>
                  <Text style={[styles.goalTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                    {formatRange({
                      start: {
                        bookId: chunk.startBookId,
                        chapter: chunk.startChapter,
                        verse: chunk.startVerse,
                      },
                      end: {
                        bookId: chunk.endBookId,
                        chapter: chunk.endChapter,
                        verse: chunk.endVerse,
                      },
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
        </View>
      )}
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
  );

  return (
    <Screen title="Library" wide>
      {isWide ? (
        <FoldAwareRow>
          <>
            {header('In progress')}
            {inProgress}
          </>
          <>
            {header('Memorized')}
            {memorized}
          </>
        </FoldAwareRow>
      ) : (
        <>
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
          {segment === 'inProgress' ? inProgress : memorized}
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
  // Matches the Screen scaffold's vertical rhythm between cards.
  stack: { gap: spacing.lg },
  shelfTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: -spacing.xs,
  },
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
  // The title wraps beside the trash button, which stays top-right.
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleText: { flex: 1 },
  goalSub: { fontSize: 13, marginTop: spacing.xs },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  cell: { width: 16, height: 16, borderRadius: 4 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xl },
  focusNote: { fontSize: 15, fontWeight: '600' },
  practiceLink: { marginTop: spacing.md, alignSelf: 'flex-start' },
  newGoal: {
    borderWidth: 1.5,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  practiceLinkText: { fontSize: 15, fontWeight: '600' },
  memorizedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  memorizedText: { flex: 1 },
});
