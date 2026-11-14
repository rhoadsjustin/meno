import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { NavRow } from '@/components/nav-row';
import { useScreenReader } from '@/components/screen-reader';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/button';
import { SymbolIcon } from '@/components/symbol';
import { TextLink } from '@/components/text-link';
import { Unavailable } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import { ChunkHeatmap, PassageCard } from '@/features/goals/PassageCard';
import { useGoalRemoval } from '@/features/goals/useGoalRemoval';
import { AdventInviteCard, AdventProgressCard, useAdventOffer } from '@/features/advent/AdventCard';
import {
  chunkRangeLabel,
  goalAction,
  practiceHref,
  progressFor,
  stepCopy,
  type GoalProgress,
} from '@/services/goals/progress';
import {
  STARTER_STACK_TEXT_SCALE,
  StarterDeck,
  StarterDeckPlaceholder,
} from '@/features/goals/StarterDeck';
import { useStartStarter } from '@/features/goals/useStartStarter';
import { TierLadder } from '@/features/practice/TierLadder';
import { ReminderPrompt } from '@/features/reminders/ReminderPrompt';
import { RecapTodayCard, useRecapOffer } from '@/features/wrapped/RecapEntry';
import {
  formatRange,
  getPassage,
  getTranslation,
  starterPassages,
  type StarterPassage,
} from '@/services/bible';
import {
  activeGoal,
  listActiveGoals,
  listGoals,
  type Goal,
} from '@/services/db/repos/goals';
import { shareGoalChallengeOrAlert } from '@/services/challenges';
import { countDueReviews } from '@/services/db/repos/reviews';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { firstLetters } from '@/services/practice';
import type { StreakDisplay } from '@/services/streaks';
import { showGoalOnWidgets } from '@/services/widgets';
import { useThemeColors, fonts, spacing, scriptureType, textStyle } from '@/theme';
import { useMotion } from '@/theme/motion';

/** 07 §8, "Streak day secured: ember pulse": one bounce, then cleared. */
const EMBER_PULSE = { effect: { type: 'bounce', wholeSymbol: true } } as const;
const EMBER_PULSE_MS = 1200;

/** The focus passage (the one on the widgets) gets the hero card and its text. */
type TodayData = GoalProgress & { chunkText: string };

/** Dissolution level for the hero card (07 §1): the text thins as the tier
 * climbs — full → first letters → reference only. */
function dissolve(text: string, tier: number): { display: string; mono: boolean } {
  if (tier >= 6) return { display: '', mono: false };
  if (tier >= 3) return { display: firstLetters(text), mono: true };
  return { display: text, mono: false };
}

export default function TodayScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['today', 'app', 'common']);
  // Windows wider than tall (iPhone Duo opened, Split View): hero on the
  // left, the ladder and secondary cards on the right instead of one long
  // stack. Opened and rotated (669×951) keeps the one column.
  const { twoPane } = useContentLayout();
  // At accessibility text sizes the starter cards stack (StarterDeck), so
  // there is nothing to swipe and the stack is long: the way into the picker
  // goes above it instead of several screens below.
  const stackedStarters = useWindowDimensions().fontScale >= STARTER_STACK_TEXT_SCALE;
  // With VoiceOver the deck is some thirty stops (eight cards of four), so
  // "Choose my own passage" comes before it there too.
  const actionsFirst = useScreenReader() || stackedStarters;
  const [data, setData] = useState<TodayData | null>(null);
  const [others, setOthers] = useState<GoalProgress[]>([]);
  const [streak, setStreak] = useState<StreakDisplay | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // The first load threw, so there is nothing true to show: neither the
  // passages nor the first-run empty state. Once a load has succeeded, a
  // later failure keeps what is on screen instead.
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const everLoaded = useRef(false);
  // Quick start (empty state only): the starter cards.
  const [starters, setStarters] = useState<StarterPassage[] | null>(null);
  const [startersFailed, setStartersFailed] = useState(false);
  // Nothing in progress, but passages finished earlier: the empty state
  // must not tell someone with memorized verses that they have none.
  const [hasFinished, setHasFinished] = useState(false);
  // Year in the Word, in season (docs/10 §5.5).
  const recapOffer = useRecapOffer();
  // The Advent plan, in season (docs/11 §3.2).
  const advent = useAdventOffer();

  // The quick-start cards for the empty state. A failure says so and offers
  // a retry, rather than leaving the empty state with no cards.
  const loadStarters = useCallback(
    (isCancelled: () => boolean) => {
      setStartersFailed(false);
      starterPassages()
        .then((passages) => {
          if (!isCancelled()) setStarters(passages);
        })
        .catch(() => {
          if (isCancelled()) return;
          setStartersFailed(true);
          AccessibilityInfo.announceForAccessibility(t('empty.startersFailed'));
        });
    },
    [t],
  );

  // Reads everything this screen shows; `isCancelled` guards a blurred screen.
  const load = useCallback(
    async (isCancelled: () => boolean) => {
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
        if (!isCancelled()) loadStarters(isCancelled);
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
    },
    [loadStarters],
  );

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
          // Stale data stays on screen; with none, say the load failed.
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

  // Delete or Stop in an Also practicing card's menu, as in Library.
  const reloadNow = useCallback(() => reload(() => false), [reload]);
  const removalFor = useGoalRemoval(reloadNow);

  // Quick start: the same path as onboarding's last step (useStartStarter).
  const openPractice = useCallback((goal: Goal) => router.push(`/practice/${goal.id}`), []);
  const { startingId, failed: startFailed, start } = useStartStarter(openPractice);
  // Stay in the translation the card showed: no ESV attempt for a KJV card.
  const startStarter = useCallback(
    (passage: StarterPassage) =>
      start(passage.starter, { preferEsv: passage.translationId !== 'kjv' }),
    [start],
  );

  // The flame bounces once when today becomes secured while this screen is
  // alive (coming back from a session), never on the first read and never
  // under Reduce Motion. The effect plays when it is set, so it is cleared
  // again rather than left to replay on a later prop change.
  const { reduce } = useMotion();
  const secured = streak ? streak.activeToday : null;
  const wasSecured = useRef<boolean | null>(null);
  const [emberPulse, setEmberPulse] = useState(false);
  useEffect(() => {
    const before = wasSecured.current;
    wasSecured.current = secured;
    if (before !== false || secured !== true || reduce) return;
    setEmberPulse(true);
    const timer = setTimeout(() => setEmberPulse(false), EMBER_PULSE_MS);
    return () => clearTimeout(timer);
  }, [secured, reduce]);

  const ember = streak && streak.current > 0 && (
    // 07 §6: a lapis flame, hollow until today is secured. The label says
    // which, so the state never rests on the fill or the colour alone.
    <View
      accessible
      accessibilityLabel={t(streak.activeToday ? 'streakSecured' : 'streak', {
        count: streak.current,
      })}
      style={styles.ember}>
      <SymbolIcon
        ios={streak.activeToday ? 'flame.fill' : 'flame'}
        android="local_fire_department"
        size={17}
        weight="semibold"
        color={streak.activeToday ? colors.lapis : colors.inkFaint}
        maxFontSizeMultiplier={1.6}
        animationSpec={emberPulse ? EMBER_PULSE : undefined}
      />
      <Text
        maxFontSizeMultiplier={1.6}
        style={[
          styles.emberCount,
          { color: streak.activeToday ? colors.lapis : colors.inkFaint, fontFamily: fonts?.ui },
        ]}>
        {streak.current}
      </Text>
    </View>
  );

  // Only worth saying which passage is on the widgets once there's a choice.
  const focusLabel = others.length > 0 && (
    <SectionHeader kind="kicker" tone="accent" title={t('focusLabel')} style={styles.focusLabel} />
  );

  // First run, before the user has a passage: the quick-start cards and the
  // way into the wizard. Kept apart from `hero` so a wide window can give the
  // cards a pane of their own instead of leaving half the screen empty.
  const isEmpty = loaded && !data && !loadFailed;
  const emptyIntro = isEmpty && (
    <View style={styles.emptyIntro}>
      <Text
        accessibilityRole="header"
        style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {hasFinished ? t('empty.titleAgain') : t('empty.titleFirst')}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {hasFinished ? t('empty.bodyAgain') : t('empty.bodyFirst')}
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
  // Holds the deck's place until the cards arrive (or their load fails).
  const emptyDeckLoading = isEmpty && !starters && !startersFailed && <StarterDeckPlaceholder />;
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
      {startersFailed && !starters && (
        <View style={styles.emptyIntro}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.emptyBody, { color: colors.error, fontFamily: fonts?.ui }]}>
            {t('empty.startersFailed')}
          </Text>
          <TextLink label={t('common:retry')} onPress={() => loadStarters(() => false)} />
        </View>
      )}
      <TextLink
        label={t('empty.chooseOwn')}
        onPress={() => router.push('/goal-wizard')}
        labelStyle={styles.readingLink}
      />
    </>
  );

  // Reading the passage in context belongs with the passage: a quiet row at
  // the foot of its card, not a link under everything else on the page.
  const readingRow = data && (
    <View style={[styles.cardFoot, { borderTopColor: colors.inkFaint }]}>
      <TextLink
        accessibilityRole="link"
        label={t('continueReading', {
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
        onPress={() =>
          router.push(
            `/reader/${data.goal.startBookId}.${data.chunk?.startChapter ?? data.goal.startChapter}.1?translation=${data.goal.translationId}`,
          )
        }
        labelStyle={styles.readingLink}
      />
    </View>
  );

  // Adding a passage sits with the title, where a bar button would be. The
  // memorized card already offers the wizard, so it is not repeated there.
  const addPassage = data?.chunk && (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('addPassage')}
      hitSlop={spacing.sm}
      onPress={() => router.push('/goal-wizard')}
      style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
      <SymbolIcon ios="plus" android="add" size={20} weight="semibold" color={colors.lapis} />
    </Pressable>
  );
  const titleAccessory = (ember || addPassage) && (
    <View style={styles.titleAccessory}>
      {ember}
      {addPassage}
    </View>
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
          {/* The same picture of progress as the cards under Also practicing
              and in Library. */}
          <ChunkHeatmap title={data.goal.title} chunks={data.chunks} style={styles.heatmap} />
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
                <Button
                  // The reference is on the line above; the button only names the step.
                  label={copy.verb}
                  accessibilityLabel={copy.spoken}
                  onPress={() => router.push(practiceHref(data.goal.id))}
                  style={styles.primaryButton}
                />
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
                <View style={[styles.sealOffer, { borderTopColor: colors.inkFaint }]}>
                  <Text
                    style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {t('hero.sealOffer', { ref: sealRef })}
                  </Text>
                  <TextLink
                    weight="semibold"
                    label={t('hero.recite', { ref: sealRef })}
                    accessibilityLabel={t('hero.sealSpoken', { ref: sealRef })}
                    onPress={() => router.push(practiceHref(data.goal.id, sealChunk))}
                  />
                </View>
              );
            })()}
          {readingRow}
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
          <ChunkHeatmap title={data.goal.title} chunks={data.chunks} style={styles.heatmap} />
          <Button
            label={t('hero.chooseAnother')}
            onPress={() => router.push('/goal-wizard')}
            style={styles.primaryButton}
          />
          {readingRow}
        </Card>
      )}
    </>
  );

  const secondary = (
    <>
      {data?.stitchDue && (
        <Card>
          <NavRow
            title={t('stitch.title')}
            detail={t('stitch.body')}
            onPress={() => router.push(`/stitch/${data.goal.id}`)}
          />
        </Card>
      )}

      {dueCount > 0 && (
        <Card>
          <NavRow
            title={t('due.title')}
            // A count, not a list: the row is a nudge, and the session
            // itself names the verses.
            badge={dueCount}
            accessibilityLabel={`${t('due.title')}. ${t('due.body', { count: dueCount })}`}
            onPress={() => router.push('/review')}
          />
        </Card>
      )}

      {others.length > 0 && (
        <>
          <SectionHeader title={t('others.header')} style={styles.sectionHeader} />
          {others.map((o) => {
            const sealChunk = o.sealChunk;
            return (
              // The Library's card for a passage in progress, so the two
              // lists read as one. Tinted: the hero's is the one filled
              // button (07 §6). Making it the focus is in the More menu.
              <PassageCard
                key={o.goal.id}
                goal={o.goal}
                chunks={o.chunks}
                action={goalAction(o)}
                actionVariant="tinted"
                menu={{
                  onShare: () => void shareGoalChallengeOrAlert(o.goal),
                  onShowOnWidgets: () => void showOnWidgets(o.goal),
                  removal: removalFor(o.goal, o.chunks),
                }}
                secondary={
                  sealChunk && (
                    <TextLink
                      weight="semibold"
                      label={t('others.seal', { ref: chunkRangeLabel(sealChunk) })}
                      accessibilityLabel={t('others.sealSpoken', {
                        ref: chunkRangeLabel(sealChunk),
                      })}
                      onPress={() => router.push(practiceHref(o.goal.id, sealChunk))}
                    />
                  )
                }
              />
            );
          })}
        </>
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
      <SectionHeader title={t('ladder.title')} style={styles.asideTitle} />
      <TierLadder
        highestCleared={data.chunk.tier}
        // The rung the button opens is ringed; a resting verse has none.
        current={data.step && data.step.kind !== 'rest' ? data.step.tier : undefined}
      />
    </Card>
  );

  // Seasonal cards never come before the practice card (docs/11 §3.2): the
  // Advent invitation leads only the empty state, above the starter deck.
  // Neither shows until the first load says which of the two this is.
  const recapCard = loaded && <RecapTodayCard offer={recapOffer} />;
  const adventInvite = <AdventInviteCard offer={advent.offer} onDismiss={advent.dismiss} />;
  const adventProgress = <AdventProgressCard offer={advent.offer} />;

  return (
    <Screen
      title={t('app:tabs.today')}
      accessory={titleAccessory || undefined}
      wide
      // Side by side, each pane scrolls on its own under the title.
      panes={twoPane && !loadFailed}>
      {loadFailed ? (
        // Not the first-run empty state: someone with passages in progress
        // must not be told they have memorized nothing.
        <Unavailable
          kind="failed"
          title={t('loadFailed.title')}
          message={t('loadFailed.body')}
          action={{ label: t('common:retry'), busy: retrying, onPress: () => void retryLoad() }}
        />
      ) : twoPane ? (
        <FoldAwareRow scroll>
          <>
            {emptyIntro}
            {emptyActions}
            {hero}
          </>
          <>
            {isEmpty && adventInvite}
            {adventProgress}
            {emptyDeck}
            {emptyDeckLoading}
            {ladder}
            {secondary}
            {data && adventInvite}
            {recapCard}
            {reminderPrompt}
          </>
        </FoldAwareRow>
      ) : (
        <>
          {isEmpty && adventInvite}
          {emptyIntro}
          {actionsFirst && emptyActions}
          {emptyDeck}
          {emptyDeckLoading}
          {!actionsFirst && emptyActions}
          {hero}
          {adventProgress}
          {secondary}
          {data && adventInvite}
          {recapCard}
          {reminderPrompt}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyIntro: { paddingHorizontal: spacing.xs },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  emptyBody: textStyle.subheadline,
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  attribution: { fontSize: 13, marginTop: spacing.md },
  heatmap: { marginTop: spacing.md },
  subline: { fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  primaryButton: { marginTop: spacing.lg },
  restNote: { marginTop: spacing.lg },
  restTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  sealOffer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    // The link under the line is a 44pt target; the card's padding absorbs it.
    marginBottom: -spacing.md,
  },
  readingLink: { paddingHorizontal: 0 },
  cardFoot: {
    marginTop: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    // The link is a 44pt target; the card's padding absorbs its lower half.
    marginBottom: -spacing.md,
  },
  titleAccessory: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.md,
  },
  pressed: { opacity: 0.5 },
  ember: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  emberCount: { fontSize: 17, fontWeight: '600' },
  focusLabel: { marginBottom: spacing.sm },
  asideTitle: { marginBottom: spacing.md },
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
