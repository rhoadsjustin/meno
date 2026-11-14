import { SegmentedControl } from '@expo/ui/community/segmented-control';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useRef, useState } from 'react';
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
import { MIN_TOUCH_TARGET } from '@/components/button';
import { Unavailable } from '@/components/unavailable';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TextLink } from '@/components/text-link';
import { DeleteGoalButton } from '@/features/goals/DeleteGoalButton';
import { goalAction, progressFor, type GoalAction } from '@/services/goals/progress';
import { removeGoal, stopPassage } from '@/features/goals/remove-goal';
import { t } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { formatRange, getTranslation } from '@/services/bible';
import { shareGoalChallengeOrAlert } from '@/services/challenges';
import {
  activeGoal,
  chunksForGoal,
  listGoals,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { itemHealth, reviewItemsForChunks } from '@/services/db/repos/reviews';
import { deleteGoalPrompt, goalRemoval, stopGoalPrompt } from '@/services/goals/deletion';
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
  const { t } = useTranslation(['library', 'app', 'common']);
  // Windows wider than tall (iPhone Duo opened, Split View) show both
  // shelves side by side — In progress on the left, Memorized on the right —
  // instead of the segmented control (HIG: show the next level of hierarchy
  // when it fits). Opened and rotated (669×951) keeps the segmented column.
  const { twoPane } = useContentLayout();
  const buttonBelow = useWindowDimensions().fontScale >= BUTTON_BELOW_TEXT_SCALE;
  const [segment, setSegment] = useState<Segment>('inProgress');
  const [items, setItems] = useState<GoalWithChunks[]>([]);
  const [healthByChunk, setHealthByChunk] = useState<Record<string, Health>>({});
  // What each passage in progress offers next (the same step Today names).
  const [actions, setActions] = useState<Record<string, GoalAction | null>>({});
  const [loaded, setLoaded] = useState(false);
  // The first load threw: said as a failure, never as empty shelves. Once a
  // load has succeeded, a later failure keeps what is on screen instead.
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const everLoaded = useRef(false);
  // The passage on the widgets (services/focus).
  const [focusId, setFocusId] = useState<string | null>(null);

  // Reads everything this screen shows; `isCancelled` guards a blurred screen.
  const load = useCallback(async (isCancelled: () => boolean) => {
    const [goals, focus] = await Promise.all([listGoals(), activeGoal()]);
    const withChunks = await Promise.all(
      goals.map(async (goal) => ({ goal, chunks: await chunksForGoal(goal.id) })),
    );
    const memorizedIds = withChunks.flatMap(({ chunks }) =>
      chunks.filter((c) => c.status === 'memorized').map((c) => c.id),
    );
    // One read for every memorized chunk's health, beside the next steps.
    const [reviewItems, progress] = await Promise.all([
      reviewItemsForChunks(memorizedIds),
      Promise.all(goals.filter((g) => g.status === 'active').map(progressFor)),
    ]);
    const health: Record<string, Health> = {};
    for (const [chunkId, item] of reviewItems) health[chunkId] = itemHealth(item);
    const next: Record<string, GoalAction | null> = {};
    for (const p of progress) next[p.goal.id] = goalAction(p);
    if (!isCancelled()) {
      setItems(withChunks);
      setFocusId(focus?.id ?? null);
      setHealthByChunk(health);
      setActions(next);
      setLoaded(true);
    }
  }, []);

  // `load` with its outcome recorded. Never rejects.
  const reload = useCallback(
    (isCancelled: () => boolean) =>
      load(isCancelled).then(
        () => {
          if (isCancelled()) return;
          everLoaded.current = true;
          setLoadFailed(false);
        },
        () => {
          if (isCancelled()) return;
          // Stale shelves stay on screen; with none, say the load failed.
          if (!everLoaded.current) setLoadFailed(true);
          setLoaded(true);
        },
      ),
    [load],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void reload(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [reload]),
  );

  const retryLoad = useCallback(async () => {
    setRetrying(true);
    await reload(() => false);
    setRetrying(false);
  }, [reload]);

  const showOnWidgets = useCallback(
    async (goal: Goal) => {
      void Haptics.selectionAsync();
      try {
        await showGoalOnWidgets(goal.id);
        AccessibilityInfo.announceForAccessibility(t('nowOnWidgets', { title: goal.title }));
      } catch {
        Alert.alert(t('widgetsFailed', { title: goal.title }), t('common:tryAgainSoon'));
      } finally {
        await reload(() => false);
      }
    },
    [reload, t],
  );

  const remove = useCallback(
    async (goal: Goal) => {
      try {
        await removeGoal(goal.id);
        AccessibilityInfo.announceForAccessibility(t('remove.delete.done', { title: goal.title }));
      } catch {
        Alert.alert(t('remove.delete.failed', { title: goal.title }), t('remove.tryAgain'));
      } finally {
        await reload(() => false);
      }
    },
    [reload, t],
  );

  const stop = useCallback(
    async (goal: Goal) => {
      try {
        await stopPassage(goal.id);
        AccessibilityInfo.announceForAccessibility(t('remove.stop.done', { title: goal.title }));
      } catch {
        Alert.alert(t('remove.stop.failed', { title: goal.title }), t('remove.tryAgain'));
      } finally {
        await reload(() => false);
      }
    },
    [reload, t],
  );

  /** The trash button. Memorized Scripture is never deleted
   * (services/goals/deletion): with nothing memorized yet it deletes the
   * passage; partway through it stops it, keeping what is memorized. */
  const removalButton = (goal: Goal, chunks: Chunk[]) => {
    switch (goalRemoval(goal, chunks)) {
      case 'delete':
        return (
          <DeleteGoalButton
            label={t('remove.delete.spoken', { title: goal.title })}
            tint={colors.inkFaint}
            prompt={deleteGoalPrompt(goal.title)}
            onConfirm={() => void remove(goal)}
          />
        );
      case 'stop':
        return (
          <DeleteGoalButton
            label={t('remove.stop.spoken', { title: goal.title })}
            tint={colors.inkFaint}
            prompt={stopGoalPrompt(goal.title)}
            onConfirm={() => void stop(goal)}
          />
        );
      default:
        return null;
    }
  };

  const active = items.filter(({ goal }) => goal.status === 'active');
  // Only offer a choice once there is more than one passage in progress.
  const activeCount = active.length;

  const memorizedChunks = items.flatMap(({ goal, chunks }) =>
    chunks.filter((c) => c.status === 'memorized').map((c) => ({ goal, chunk: c })),
  );

  // Two panes: In progress leads and Memorized is the second pane. One
  // column: the segment chooses the shelf.
  const firstShelf: Segment = twoPane ? 'inProgress' : segment;

  const header = (label: string) => (
    <SectionHeader title={label} style={styles.shelfTitle} />
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
                {!buttonBelow && removalButton(goal, chunks)}
              </View>
              <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t('goal.summary', {
                  translation: getTranslation(goal.translationId).abbrev,
                  done: chunks.filter((c) => c.status === 'memorized').length,
                  count: chunks.length,
                })}
              </Text>
              <View
                style={styles.heatmap}
                accessible
                accessibilityLabel={t('goal.heatmap', {
                  title: goal.title,
                  memorized: chunks.filter((c) => c.status === 'memorized').length,
                  learning: chunks.filter((c) => c.status === 'learning' || c.status === 'active')
                    .length,
                  locked: chunks.filter((c) => c.status === 'locked').length,
                })}>
                {chunks.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.cell, { backgroundColor: cellColor(c, colors) }]}
                  />
                ))}
              </View>
              <View style={styles.actionsRow}>
                {(() => {
                  // The step Today would name for this passage: Start,
                  // Continue, Seal or Stitch. A resting verse has a status
                  // in place of a link, as there is nothing to open today.
                  const action = actions[goal.id];
                  if (!action) return null;
                  if (action.kind === 'resting') {
                    return (
                      <Text
                        accessibilityLabel={action.spoken}
                        style={[
                          styles.actionCell,
                          styles.focusNote,
                          { color: colors.inkFaint, fontFamily: fonts?.ui },
                        ]}>
                        {action.label}
                      </Text>
                    );
                  }
                  return (
                    <TextLink
                      weight="semibold"
                      label={action.label}
                      accessibilityLabel={action.spoken}
                      onPress={() => router.push(action.href)}
                    />
                  );
                })()}
                <TextLink
                  weight="semibold"
                  label={t('goal.share')}
                  accessibilityLabel={t('goal.shareSpoken', { title: goal.title })}
                  onPress={() => void shareGoalChallengeOrAlert(goal)}
                />
                {activeCount > 1 &&
                  (goal.id === focusId ? (
                    <Text
                      style={[
                        styles.actionCell,
                        styles.focusNote,
                        { color: colors.inkFaint, fontFamily: fonts?.ui },
                      ]}>
                      {t('goal.onWidgets')}
                    </Text>
                  ) : (
                    <TextLink
                      weight="semibold"
                      label={t('goal.showOnWidgets')}
                      accessibilityLabel={t('goal.showOnWidgetsSpoken', { title: goal.title })}
                      onPress={() => void showOnWidgets(goal)}
                    />
                  ))}
                {buttonBelow && goalRemoval(goal, chunks) && (
                  <View style={styles.actionCell}>{removalButton(goal, chunks)}</View>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
      {loaded && active.length === 0 && (
        // The way forward sits inside the empty state, not detached below it.
        <Card>
          <Unavailable
            kind="empty"
            symbol={{ ios: 'books.vertical', android: 'library_books' }}
            title={t('emptyInProgressTitle')}
            message={t('emptyInProgressBody')}
            action={{ label: t('addPassage'), onPress: () => router.push('/goal-wizard') }}
          />
        </Card>
      )}
      {loaded && active.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/goal-wizard')}
          style={({ pressed }) => [
            styles.newGoal,
            { borderColor: colors.lapis },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.practiceLinkText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('addPassage')}
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
                    {t('memorizedDetail', {
                      translation: getTranslation(goal.translationId).abbrev,
                      health: healthLabel(healthByChunk[chunk.id] ?? 'fresh'),
                    })}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      {loaded && memorizedChunks.length === 0 && (
        <Card>
          <Unavailable
            kind="empty"
            symbol={{ ios: 'checkmark.seal', android: 'verified' }}
            title={t('emptyMemorizedTitle')}
            message={t('emptyMemorizedBody')}
          />
        </Card>
      )}
    </>
  );

  return (
    <Screen title={t('app:tabs.library')} wide>
      {loadFailed ? (
        // In place of both shelves: "No passages yet" here would read as
        // lost data, and the add prompt would be beside the point.
        <Unavailable
          kind="failed"
          title={t('loadFailed.title')}
          message={t('loadFailed.body')}
          action={{ label: t('common:retry'), busy: retrying, onPress: () => void retryLoad() }}
        />
      ) : (
        <>
          {!twoPane && (
            // The system's segmented control (SwiftUI's segmented Picker on
            // iOS, Material segmented buttons on Android): its own selected
            // state, VoiceOver traits and Dynamic Type. No label of its own:
            // each segment is read by its title, which Maestro flow 04 also
            // looks for.
            <SegmentedControl
              values={[t('inProgress'), t('memorized')]}
              selectedIndex={segment === 'inProgress' ? 0 : 1}
              onChange={(e) =>
                setSegment(e.nativeEvent.selectedSegmentIndex === 0 ? 'inProgress' : 'memorized')
              }
            />
          )}
          {/* Always the row, and each shelf under its own key: crossing the
              two-pane breakpoint (folding or unfolding iPhone Duo) changes
              only the control and the headers, so the cards — and a delete
              confirmation open on one — are not remounted. */}
          <FoldAwareRow>
            <>
              {twoPane && header(t('inProgress'))}
              <Fragment key={firstShelf}>
                {firstShelf === 'inProgress' ? inProgress : memorized}
              </Fragment>
            </>
            {twoPane ? (
              <>
                {header(t('memorized'))}
                {memorized}
              </>
            ) : null}
          </FoldAwareRow>
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
  return health === 'fresh'
    ? t('library:health.fresh')
    : health === 'fading'
      ? t('library:health.fading')
      : t('library:health.atRisk');
}

/** lapisWash → lapis by tier; gold when memorized (docs/07 §6). */
function cellColor(chunk: Chunk, colors: ThemeColors): string {
  if (chunk.status === 'memorized') return colors.gold;
  if (chunk.status === 'locked') return colors.separator;
  const level = Math.min(chunk.tier, 5) / 5;
  // Blend lapisWash → lapis in 6 steps via opacity layering approximation.
  return level < 0.2 ? colors.lapisWash : level < 0.6 ? `${colors.lapis}88` : colors.lapis;
}

const styles = StyleSheet.create({
  // Matches the Screen scaffold's vertical rhythm between cards.
  stack: { gap: spacing.lg },
  shelfTitle: { marginBottom: -spacing.xs },
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
  cell: { width: 16, height: 16, borderRadius: radius.cell },
  // The links are 44pt targets whose text sits where it did: the target
  // reaches into the card's bottom padding rather than making the card taller.
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: spacing.xl,
    marginBottom: -spacing.md,
  },
  pressed: { opacity: 0.6 },
  focusNote: { fontSize: 15, fontWeight: '600' },
  // The note and the trash button, padded to line up with the 44pt links.
  actionCell: { paddingVertical: spacing.md, alignSelf: 'flex-start' },
  newGoal: {
    borderWidth: 1.5,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceLinkText: { fontSize: 15, fontWeight: '600' },
  memorizedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  memorizedText: { flex: 1 },
});
