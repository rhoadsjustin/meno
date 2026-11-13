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
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Button, MIN_TOUCH_TARGET } from '@/components/button';
import { Unavailable } from '@/components/unavailable';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { GoalMenu, type GoalMenuProps } from '@/features/goals/GoalMenu';
import { goalAction, progressFor, type GoalAction } from '@/services/goals/progress';
import { removeGoal, stopPassage } from '@/features/goals/remove-goal';
import { t } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { formatRange, getTranslation } from '@/services/bible';
import { shareGoalChallenge } from '@/services/challenges';
import {
  activeGoal,
  chunksForGoal,
  listGoals,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { itemHealth, reviewItemsForChunks } from '@/services/db/repos/reviews';
import { deleteGoalPrompt, goalRemoval, stopGoalPrompt } from '@/services/goals/deletion';
import { sortByRisk } from '@/services/goals/memorized-order';
import type { Health } from '@/services/scheduler';
import { showGoalOnWidgets } from '@/services/widgets';
import { useThemeColors, fonts, radius, spacing, type ThemeColors } from '@/theme';

type Segment = 'inProgress' | 'memorized';

type GoalWithChunks = { goal: Goal; chunks: Chunk[] };

export default function LibraryScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['library', 'app', 'common']);
  // Windows wider than tall (iPhone Duo opened, Split View) show both
  // shelves side by side — In progress on the left, Memorized on the right —
  // instead of the segmented control (HIG: show the next level of hierarchy
  // when it fits). Opened and rotated (669×951) keeps the segmented column.
  const { twoPane } = useContentLayout();
  const [segment, setSegment] = useState<Segment>('inProgress');
  const [items, setItems] = useState<GoalWithChunks[]>([]);
  const [healthByChunk, setHealthByChunk] = useState<Record<string, Health>>({});
  // When each memorized chunk's review falls due: the Memorized shelf's order.
  const [dueByChunk, setDueByChunk] = useState<Record<string, number>>({});
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
    const due: Record<string, number> = {};
    for (const [chunkId, item] of reviewItems) {
      health[chunkId] = itemHealth(item);
      due[chunkId] = item.dueAt.getTime();
    }
    const next: Record<string, GoalAction | null> = {};
    for (const p of progress) next[p.goal.id] = goalAction(p);
    if (!isCancelled()) {
      setItems(withChunks);
      setFocusId(focus?.id ?? null);
      setHealthByChunk(health);
      setDueByChunk(due);
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

  /** Delete or Stop in the card's menu. Memorized Scripture is never deleted
   * (services/goals/deletion): with nothing memorized yet the passage is
   * deleted; partway through it is stopped, keeping what is memorized. */
  const removalFor = (goal: Goal, chunks: Chunk[]): GoalMenuProps['removal'] => {
    switch (goalRemoval(goal, chunks)) {
      case 'delete':
        return {
          kind: 'delete',
          prompt: deleteGoalPrompt(goal.title),
          onConfirm: () => void remove(goal),
        };
      case 'stop':
        return {
          kind: 'stop',
          prompt: stopGoalPrompt(goal.title),
          onConfirm: () => void stop(goal),
        };
      default:
        return undefined;
    }
  };

  const active = items.filter(({ goal }) => goal.status === 'active');
  // Only offer a choice once there is more than one passage in progress.
  const activeCount = active.length;

  // Sorted by risk (07 §6): the review most overdue first, so at risk leads,
  // then fading, then fresh.
  const memorizedChunks = sortByRisk(
    items.flatMap(({ goal, chunks }) =>
      chunks.filter((c) => c.status === 'memorized').map((c) => ({ goal, chunk: c })),
    ),
    ({ chunk }) => dueByChunk[chunk.id],
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
                <GoalMenu
                  label={t('goal.moreSpoken', { title: goal.title })}
                  tint={colors.inkFaint}
                  onShare={() => void shareGoalChallenge(goal).catch(() => {})}
                  onShowOnWidgets={
                    activeCount > 1 && goal.id !== focusId
                      ? () => void showOnWidgets(goal)
                      : undefined
                  }
                  removal={removalFor(goal, chunks)}
                />
              </View>
              <Text style={[styles.goalSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t('goal.summary', {
                  translation: getTranslation(goal.translationId).abbrev,
                  done: chunks.filter((c) => c.status === 'memorized').length,
                  count: chunks.length,
                })}
              </Text>
              {activeCount > 1 && goal.id === focusId && (
                // A status, not a control: it sits with the summary.
                <Text style={[styles.focusNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {t('goal.onWidgets')}
                </Text>
              )}
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
                    style={[
                      styles.cell,
                      c.status === 'locked'
                        ? // Not started: an outline, so it differs from a
                          // started chunk by shape as well as colour.
                          { borderWidth: 1, borderColor: colors.inkFaint }
                        : { backgroundColor: cellColor(c, colors) },
                    ]}
                  />
                ))}
              </View>
              {(() => {
                // The one action on the card is the step Today would name
                // for this passage: Start, Continue, Seal or Stitch. A
                // resting verse has a status in its place, as there is
                // nothing to open today. The rest is in the More menu.
                const action = actions[goal.id];
                if (!action) return null;
                if (action.kind === 'resting') {
                  return (
                    <Text
                      accessibilityLabel={action.spoken}
                      style={[
                        styles.resting,
                        { color: colors.inkFaint, fontFamily: fonts?.ui },
                      ]}>
                      {action.label}
                    </Text>
                  );
                }
                return (
                  <Button
                    size="small"
                    label={action.label}
                    accessibilityLabel={action.spoken}
                    onPress={() => router.push(action.href)}
                    style={styles.primaryAction}
                  />
                );
              })()}
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
        // One list in one card, its rows parted by hairlines (07 §6: a list).
        <Card style={styles.memorizedList}>
          {memorizedChunks.map(({ goal, chunk }, index) => (
            <View
              key={chunk.id}
              style={[
                styles.memorizedRow,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.separator,
                },
              ]}>
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
          ))}
        </Card>
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
  // The title wraps beside the More button, which stays top-right.
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
  // "On your widgets", a caption under the summary.
  focusNote: { fontSize: 13, marginTop: spacing.xs },
  // The card's one action, sized to its label at the leading edge.
  primaryAction: { alignSelf: 'flex-start', marginTop: spacing.md },
  resting: { fontSize: 15, fontWeight: '600', marginTop: spacing.md },
  pressed: { opacity: 0.6 },
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
  // The card's padding comes from its rows, so the hairlines run edge to edge
  // of the text column and each row keeps a 44pt height.
  memorizedList: { paddingVertical: 0 },
  memorizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  memorizedText: { flex: 1 },
});
