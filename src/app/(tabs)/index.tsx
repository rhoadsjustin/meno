import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { t } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { STARTER_STACK_TEXT_SCALE, StarterDeck } from '@/features/goals/StarterDeck';
import { TierLadder } from '@/features/practice/TierLadder';
import { ReminderPrompt } from '@/features/reminders/ReminderPrompt';
import {
  formatRange,
  getPassage,
  getTranslation,
  starterPassages,
  type StarterPassage,
} from '@/services/bible';
import {
  activeGoal,
  chunkProgressLabel,
  listActiveGoals,
  listGoals,
  practicePlan,
  startStarterGoal,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import { countDueReviews } from '@/services/db/repos/reviews';
import { stitchPlan } from '@/services/db/repos/stitch';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { describeStep, firstLetters, type PracticeStep } from '@/services/practice';
import type { StreakDisplay } from '@/services/streaks';
import { showGoalOnWidgets } from '@/services/widgets';
import { useThemeColors, fonts, radius, spacing, scriptureType } from '@/theme';

/** Where one passage in progress stands. */
type GoalProgress = {
  goal: Goal;
  /** The chunk the main button opens, and what opening it does. */
  chunk: Chunk | null;
  step: PracticeStep | null;
  /** The verse that follows when `step` is a seal ahead of new work. */
  thenChunk: Chunk | null;
  /** A verse one recitation from memorized, offered beside the new work. */
  sealChunk: Chunk | null;
  totalChunks: number;
  stitchDue: boolean;
};

/** The focus passage (the one on the widgets) gets the hero card and its text. */
type TodayData = GoalProgress & { chunkText: string };

async function progressFor(goal: Goal): Promise<GoalProgress> {
  const [{ plan, chunks }, stitch] = await Promise.all([
    practicePlan(goal.id),
    stitchPlan(goal.id),
  ]);
  const chunkOf = (step: PracticeStep | null) =>
    (step && chunks.find((c) => c.id === step.chunkId)) || null;
  return {
    goal,
    chunk: chunkOf(plan.next),
    step: plan.next,
    thenChunk: chunkOf(plan.then),
    sealChunk: chunkOf(plan.optionalSeal),
    totalChunks: chunks.length,
    stitchDue: stitch.due,
  };
}

/** Button and sub-line copy for a passage's next step (services/practice/plan). */
function stepCopy(p: GoalProgress & { chunk: Chunk; step: PracticeStep }) {
  const copy = describeStep(
    p.step,
    chunkRangeLabel(p.chunk),
    p.thenChunk ? chunkRangeLabel(p.thenChunk) : undefined,
  );
  // Where the verse sits in a longer passage (07 §6); a one-chunk goal has
  // nothing to place.
  const place =
    p.totalChunks > 1
      ? t('today:hero.chunkPlace', { index: p.chunk.orderIndex + 1, total: p.totalChunks })
      : '';
  return {
    ...copy,
    subline: place ? t('today:hero.placeAndDetail', { place, detail: copy.subline }) : copy.subline,
    // The sub-line is not read on its own (the button says it all), so the
    // spoken sentence carries the position too.
    spoken: place ? t('today:hero.spokenWithPlace', { spoken: copy.spoken, place }) : copy.spoken,
  };
}

function practiceHref(goalId: string, chunk?: Chunk): Href {
  return chunk
    ? `/practice/${goalId}?chunk=${encodeURIComponent(chunk.id)}`
    : `/practice/${goalId}`;
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
  const { t } = useTranslation(['today', 'app']);
  // Wide windows (iPhone Duo opened, Split View): hero on the left, the
  // ladder and secondary cards on the right instead of one long stack.
  const { isWide } = useContentLayout();
  // At accessibility text sizes the starter cards stack (StarterDeck), so
  // there is nothing to swipe and the stack is long: the way into the picker
  // goes above it instead of several screens below.
  const stackedStarters = useWindowDimensions().fontScale >= STARTER_STACK_TEXT_SCALE;
  const [data, setData] = useState<TodayData | null>(null);
  const [others, setOthers] = useState<GoalProgress[]>([]);
  const [streak, setStreak] = useState<StreakDisplay | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Quick start (empty state only): the starter cards, and which one is
  // being turned into a passage right now.
  const [starters, setStarters] = useState<StarterPassage[] | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  // Nothing in progress, but passages finished earlier: the empty state
  // must not tell someone with memorized verses that they have none.
  const [hasFinished, setHasFinished] = useState(false);
  const startBusy = useRef(false);

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
      const finished = (await listGoals()).length > 0;
      if (!isCancelled()) {
        setHasFinished(finished);
        setData(null);
        setOthers([]);
        setStreak(streakNow);
        setLoaded(true);
      }
      // The empty state doesn't wait on the cards: bundled text is instant,
      // but ESV may take a moment (and gives way to KJV if it can't be had).
      starterPassages()
        .then((passages) => {
          if (!isCancelled()) setStarters(passages);
        })
        .catch(() => {});
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
    }, [load]),
  );

  const showOnWidgets = useCallback(
    async (goal: Goal) => {
      void Haptics.selectionAsync();
      try {
        await showGoalOnWidgets(goal.id);
        AccessibilityInfo.announceForAccessibility(t('nowOnWidgets', { title: goal.title }));
      } finally {
        await load(() => false);
      }
    },
    [load, t],
  );

  // One tap, one passage: the ref blocks a second tap before React has
  // re-rendered the disabled buttons (and `startStarterGoal` dedupes too).
  const startStarter = useCallback(async (passage: StarterPassage) => {
    if (startBusy.current) return;
    startBusy.current = true;
    setStartingId(passage.starter.id);
    setStartFailed(false);
    void Haptics.selectionAsync();
    try {
      // Stay in the translation the card showed: no ESV attempt for a KJV card.
      const goal = await startStarterGoal(passage.starter, {
        preferEsv: passage.translationId !== 'kjv',
      });
      router.push(`/practice/${goal.id}`);
    } catch {
      setStartFailed(true);
    } finally {
      startBusy.current = false;
      setStartingId(null);
    }
  }, []);

  const ember = streak && streak.current > 0 && (
    <Text
      accessibilityLabel={t(streak.activeToday ? 'streakSecured' : 'streak', {
        count: streak.current,
      })}
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
      {t('focusLabel')}
    </Text>
  );

  // First run, before the user has a passage: the quick-start cards and the
  // way into the wizard. Kept apart from `hero` so a wide window can give the
  // cards a pane of their own instead of leaving half the screen empty.
  const isEmpty = loaded && !data;
  const emptyIntro = isEmpty && (
    <View style={styles.emptyIntro}>
      <Text
        accessibilityRole="header"
        style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {hasFinished ? t('empty.titleAgain') : t('empty.titleFirst')}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {hasFinished
          ? stackedStarters
            ? t('empty.bodyAgainChoose')
            : t('empty.bodyAgainSwipe')
          : stackedStarters
            ? t('empty.bodyFirstChoose')
            : t('empty.bodyFirstSwipe')}
      </Text>
    </View>
  );
  const emptyDeck = isEmpty && starters && (
    <StarterDeck
      passages={starters}
      startingId={startingId}
      onStart={(passage) => void startStarter(passage)}
    />
  );
  const emptyActions = isEmpty && (
    <>
      {startFailed && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.emptyBody,
            styles.emptyIntro,
            { color: colors.error, fontFamily: fonts?.ui },
          ]}>
          {t('empty.startFailed')}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push('/goal-wizard')}
        style={styles.quietAction}>
        <Text style={[styles.readingLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
          {t('empty.chooseOwn')}
        </Text>
      </Pressable>
    </>
  );

  const hero = (
    <>
      {data && data.chunk && data.step && (
        <Card>
          {focusLabel}
          {(() => {
            const { display, mono } = dissolve(data.chunkText, data.chunk.tier);
            return display ? (
              <Text
                // First letters are a prompt for the eye; read aloud they are
                // noise. The full text is read as it stands.
                accessibilityLabel={
                  mono
                    ? t('hero.passageFirstLetters', { ref: chunkRangeLabel(data.chunk) })
                    : t('hero.passageFull', { ref: chunkRangeLabel(data.chunk), text: display })
                }
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
              <Text
                // Ink, not gold: the text is hidden because the ladder is
                // topped, but the verse is not memorized until it is sealed.
                style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                {chunkRangeLabel(data.chunk)}
              </Text>
            );
          })()}
          <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('hero.attribution', {
              ref: chunkRangeLabel(data.chunk),
              translation: getTranslation(data.goal.translationId).abbrev,
            })}
          </Text>
          {(() => {
            const copy = stepCopy({ ...data, chunk: data.chunk, step: data.step });
            // Topped the ladder today: there is nothing to open, so this
            // is a status rather than a button.
            if (data.step.kind === 'rest') {
              return (
                <View accessible accessibilityLabel={copy.spoken} style={styles.restNote}>
                  <Text style={[styles.restTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                    {copy.button}
                  </Text>
                  <Text style={[styles.subline, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {copy.subline}
                  </Text>
                </View>
              );
            }
            return (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.spoken}
                  onPress={() => router.push(practiceHref(data.goal.id))}
                  style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
                  <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>
                    {copy.button}
                  </Text>
                </Pressable>
                <Text
                  // Hidden from VoiceOver: the button's label already says it.
                  // (`accessible={false}` alone still leaves text readable.)
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.subline, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {copy.subline}
                </Text>
              </>
            );
          })()}
          {data.sealChunk &&
            (() => {
              // Yesterday's verse, beside the new work rather than ahead of
              // it. Left alone it becomes the main button (SEAL_GRACE_DAYS).
              const sealChunk = data.sealChunk;
              const sealRef = chunkRangeLabel(sealChunk);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('hero.sealSpoken', { ref: sealRef })}
                  onPress={() => router.push(practiceHref(data.goal.id, sealChunk))}
                  style={[styles.sealOffer, { borderTopColor: colors.inkFaint }]}>
                  <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {t('hero.sealOffer', { ref: sealRef })}
                  </Text>
                  <Text style={[styles.reviewLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                    {t('hero.recite', { ref: sealRef })}
                  </Text>
                </Pressable>
              );
            })()}
        </Card>
      )}

      {data && !data.chunk && (
        <Card>
          {focusLabel}
          <Text style={[styles.emptyTitle, { color: colors.gold, fontFamily: fonts?.ui }]}>
            {t('hero.memorizedTitle', { title: data.goal.title })}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('hero.memorizedBody')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goal-wizard')}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>
              {t('hero.chooseAnother')}
            </Text>
          </Pressable>
        </Card>
      )}
    </>
  );

  const secondary = (
    <>
      {data?.stitchDue && (
        <Card>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/stitch/${data.goal.id}`)}>
            <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('stitch.title')}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('stitch.body')}
            </Text>
            <Text style={[styles.reviewLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('stitch.begin')}
            </Text>
          </Pressable>
        </Card>
      )}

      {dueCount > 0 && (
        <Card>
          <Pressable accessibilityRole="button" onPress={() => router.push('/review')}>
            <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('due.title')}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('due.body', { count: dueCount })}
            </Text>
            <Text style={[styles.reviewLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('due.action', { count: dueCount })}
            </Text>
          </Pressable>
        </Card>
      )}

      {others.length > 0 && (
        <>
          <Text
            accessibilityRole="header"
            style={[styles.sectionHeader, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('others.header')}
          </Text>
          {others.map((o) => {
            const copy = o.chunk && o.step ? stepCopy({ ...o, chunk: o.chunk, step: o.step }) : null;
            // A stitch outranks the next chunk; a resting verse has no action.
            const action = o.stitchDue
              ? {
                  label: t('others.stitch'),
                  spoken: t('others.stitchSpoken', { title: o.goal.title }),
                  href: `/stitch/${o.goal.id}` as Href,
                }
              : copy && o.step?.kind !== 'rest'
                ? {
                    label: copy.verb,
                    spoken: t('others.stepSpoken', { title: o.goal.title, spoken: copy.spoken }),
                    href: practiceHref(o.goal.id),
                  }
                : null;
            const sealChunk = o.sealChunk;
            return (
              <Card key={o.goal.id}>
                <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                  {o.goal.title}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {o.chunk && copy
                    ? // A one-verse passage is its own chunk: no need to name it twice.
                      chunkRangeLabel(o.chunk) === o.goal.title
                      ? copy.subline
                      : t('others.chunkAndDetail', {
                          ref: chunkRangeLabel(o.chunk),
                          detail: copy.subline,
                        })
                    : t('others.allMemorized')}
                </Text>
                <View style={styles.otherActions}>
                  {action && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={action.spoken}
                      onPress={() => router.push(action.href)}
                      style={[styles.smallButton, { backgroundColor: colors.lapis }]}>
                      <Text style={[styles.smallButtonText, { fontFamily: fonts?.ui }]}>
                        {action.label}
                      </Text>
                    </Pressable>
                  )}
                  {sealChunk && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('others.sealSpoken', { ref: chunkRangeLabel(sealChunk) })}
                      hitSlop={8}
                      onPress={() => router.push(practiceHref(o.goal.id, sealChunk))}>
                      <Text
                        style={[styles.textAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                        {t('others.seal', { ref: chunkRangeLabel(sealChunk) })}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('others.showOnWidgetsSpoken', { title: o.goal.title })}
                    hitSlop={8}
                    onPress={() => void showOnWidgets(o.goal)}>
                    <Text
                      style={[styles.textAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                      {t('others.showOnWidgets')}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </>
  );

  const links = (
    <>
      {data && (
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push(
              `/reader/${data.goal.startBookId}.${data.chunk?.startChapter ?? data.goal.startChapter}.1?translation=${data.goal.translationId}`,
            )
          }>
          <Text style={[styles.readingLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('continueReading', {
              range: formatRange({
                start: {
                  bookId: data.goal.startBookId,
                  chapter: data.goal.startChapter,
                  verse: data.goal.startVerse,
                },
                end: {
                  bookId: data.goal.endBookId,
                  chapter: data.goal.endChapter,
                  verse: data.goal.endVerse,
                },
              }),
            })}
          </Text>
        </Pressable>
      )}

      {data && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/goal-wizard')}>
          <Text style={[styles.readingLink, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('practiceAnother')}
          </Text>
        </Pressable>
      )}
    </>
  );

  // Reminders off or blocked: said once, to someone who has a passage under
  // way and has practiced it, so it never greets a first launch.
  const reminderPrompt = (
    <ReminderPrompt
      eligible={!!data?.chunk && ((streak?.current ?? 0) > 0 || data.chunk.tier > 0)}
    />
  );

  // Where the focus chunk stands on the ladder — context that only fits
  // once there is a second column.
  const ladder = data?.chunk && (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.asideTitle, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('ladder.title')}
      </Text>
      <TierLadder highestCleared={data.chunk.tier} />
      <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {streak && streak.current > 0
          ? t(streak.activeToday ? 'ladder.withStreakSecured' : 'ladder.withStreak', {
              progress: chunkProgressLabel(data.chunk, data.totalChunks),
              count: streak.current,
            })
          : chunkProgressLabel(data.chunk, data.totalChunks)}
      </Text>
    </Card>
  );

  return (
    <Screen title={t('app:tabs.today')} accessory={ember || undefined} wide>
      {isWide ? (
        <FoldAwareRow>
          <>
            {emptyIntro}
            {emptyActions}
            {hero}
            {links}
          </>
          <>
            {emptyDeck}
            {ladder}
            {secondary}
            {reminderPrompt}
          </>
        </FoldAwareRow>
      ) : (
        <>
          {emptyIntro}
          {stackedStarters && emptyActions}
          {emptyDeck}
          {!stackedStarters && emptyActions}
          {hero}
          {secondary}
          {reminderPrompt}
          {links}
        </>
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
  emptyIntro: { paddingHorizontal: spacing.xs },
  quietAction: { paddingVertical: spacing.sm },
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  // Centred and padded: "Continue 1 Thessalonians 5:16–18" wraps at large text.
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  restNote: { marginTop: spacing.lg },
  restTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  sealOffer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
  asideTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
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
