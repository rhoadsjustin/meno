/**
 * Practice session (docs/03 §8, 07 §6): minimal chrome, one progress bar
 * across the verse's whole ladder, mode-specific rounds, word-level feedback,
 * a place to stop for the day, and a summary. Resumable at any point.
 */
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { t as translate } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { KeyboardScroll } from '@/components/keyboard-scroll';
import { useBarIcon } from '@/components/bar-icon';
import { ScreenHeader } from '@/components/screen-header';
import { formatRange, getPassage, getTranslation } from '@/services/bible';
import { recordAttempt } from '@/services/db/repos/attempts';
import {
  applyTierCleared,
  awaitingSecondDay,
  chunkProgressLabel,
  getGoal,
  practicePlan,
  type Chunk,
  type Goal,
} from '@/services/db/repos/goals';
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from '@/services/db/repos/sessionStore';
import { currentStreakDisplay, secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import { slipCount, tokenize, type GradeResult, type RoundBand } from '@/services/grading';
import {
  blanksDensity,
  currentMode,
  dropTier,
  ladderProgress,
  nextTier,
  recordRound,
  REST_TIER,
  retryTier,
  startSession,
  tierName,
  topTierStanding,
  type SessionState,
  type TopTierStanding,
} from '@/services/practice';
import { Dissolution } from '@/features/practice/Dissolution';
import { LadderProgress } from '@/features/practice/LadderProgress';
import { TierLadder } from '@/features/practice/TierLadder';
import { WordFeedback } from '@/features/practice/WordFeedback';
import { ArrangeRound } from '@/features/practice/rounds/ArrangeRound';
import { BlanksRound } from '@/features/practice/rounds/BlanksRound';
import { FirstLettersRound } from '@/features/practice/rounds/FirstLettersRound';
import { ReadRound } from '@/features/practice/rounds/ReadRound';
import { SpeakRound } from '@/features/practice/rounds/SpeakRound';
import { TypeRound } from '@/features/practice/rounds/TypeRound';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'round' }
  /** Speak is cleared and today's mastery day is banked — only a second day
   * can seal the chunk, so there is nothing left to practice here today. */
  | { kind: 'sealsTomorrow' }
  | {
      kind: 'feedback';
      accuracy: number;
      /** The round moved on: a pass or an almost. */
      passed: boolean;
      band: RoundBand;
      /** Slipped words in a graded text round; null where there is no
       * word-level result (self-report, Blanks, Arrange). */
      slips: number | null;
      tierCleared: boolean;
      memorized: boolean;
      /** Cleared the top tier without sealing: do not serve it again. */
      sealsTomorrow: boolean;
      /** Cleared the top tier on an almost with nothing banked today: say
       * so, and offer the clean recitation instead of promising tomorrow. */
      needsCleanPass: boolean;
      /** Just reached REST_TIER: offer to stop for the day. */
      restPoint: boolean;
      suggestDropTier: boolean;
      result?: GradeResult;
    }
  | {
      kind: 'summary';
      /** The chunk's highest cleared tier as the session ends. */
      standing: number;
      sealsTomorrow: boolean;
      /** Stopped after an almost at Speak: a clean recitation is still owed. */
      needsCleanPass: boolean;
      memorized: boolean;
      streak: number;
    };

export function PracticeScreen({
  goalId,
  chunkId,
}: {
  goalId: string;
  /** Practice this chunk rather than the goal's next one — Today's optional
   * seal check opens the verse it names. */
  chunkId?: string;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation(['practice', 'common']);
  const closeIcon = useBarIcon('xmark', 'close');
  // Extra-wide windows (iPhone Duo opened in its landscape pose, iPad): the
  // round keeps its reading column and a context rail sits beside it —
  // reference, chunk progress, ladder. Narrower windows keep one column so
  // Blanks and Arrange have room to work.
  const { sides, height, isExtraWide: showRail } = useContentLayout();
  // A short window (iPhone Duo opened in its landscape pose is 669pt high):
  // the feedback screen spends less on air so both its actions fit without
  // scrolling — the stopping point's "Keep going" sat on the bottom edge.
  const short = height < layout.shortHeight;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [chunk, setChunk] = useState<Chunk | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [text, setText] = useState('');
  const [session, setSession] = useState<SessionState | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  // The chunk topped the ladder on an earlier day; this round can seal it.
  const [sealing, setSealing] = useState(false);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  // Every round finished since the screen opened, across tiers — the
  // session state itself only remembers the tier in progress.
  const [log, setLog] = useState<{ accuracy: number | null; passed: boolean }[]>([]);
  const finishing = useRef(false);
  const railShown = showRail && !!session && !!chunk && !!goal;

  const load = useCallback(async () => {
    const g = await getGoal(goalId);
    if (!g) throw new Error(translate('practice:errors.goalNotFound'));
    const { plan, chunks } = await practicePlan(goalId);
    setTotalChunks(chunks.length);
    // A requested chunk is honoured only while it has something to do today.
    // Once it is sealed (or resting) the reload after a cleared tier falls
    // through to the goal's next step, like any other session.
    const requested = chunkId
      ? plan.steps.find((s) => s.chunkId === chunkId && s.kind !== 'rest')
      : undefined;
    const step = requested ?? plan.next;
    const c = step && chunks.find((candidate) => candidate.id === step.chunkId);
    if (!step || !c) {
      setPhase({ kind: 'error', message: translate('practice:errors.allMemorized') });
      setGoal(g);
      return;
    }
    const verses = await getPassage(g.translationId, {
      start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
      end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
    });
    const chunkText = verses.map((v) => v.text).join(' ');
    setSealing(step.kind === 'seal' || (step.kind === 'continue' && !!step.seals));

    // Topped the ladder and already banked today: serving Speak again would
    // just loop, since nextTier(6) is 6 and the chunk stays `learning`.
    if (step.kind === 'rest') {
      setGoal(g);
      setChunk(c);
      setText(chunkText);
      setPhase({ kind: 'sealsTomorrow' });
      return;
    }

    // Resume a persisted session for this chunk, else start fresh
    // (M2 acceptance: killing the app mid-session resumes correctly).
    const saved = await loadActiveSession();
    const s =
      saved && saved.chunkId === c.id && saved.roundIndex < saved.rounds.length
        ? saved
        : startSession({ goalId, chunkId: c.id, highestClearedTier: c.tier, now: Date.now() });
    await saveActiveSession(s);

    setGoal(g);
    setChunk(c);
    setText(chunkText);
    setSession(s);
    setPhase({ kind: 'round' });
    setRoundStartedAt(Date.now());
  }, [goalId, chunkId]);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [load]);

  const writeRound = useCallback(
    async (input: {
      accuracy?: number;
      unitCount?: number;
      selfPass?: boolean;
      missedWords?: string[];
      result?: GradeResult;
    }) => {
      if (!session || !chunk) return;
      const outcome = recordRound(session, input);
      setLog((prev) => [...prev, { accuracy: input.accuracy ?? null, passed: outcome.passed }]);
      await saveActiveSession(outcome.state);

      await recordAttempt({
        chunkId: chunk.id,
        mode: currentMode(session),
        accuracy: input.accuracy ?? (input.selfPass ? 1 : 0),
        durationMs: Date.now() - roundStartedAt,
        missedWords: input.missedWords ?? [],
        source: 'practice',
      });
      // Any completed practice item counts (docs/06 §1); today's reminder
      // is no longer needed once the day is secured.
      if ((await secureToday()).daySecured) void rescheduleAll();

      let memorized = false;
      let standing: TopTierStanding | null = null;
      if (outcome.tierCleared) {
        const unitCount = tokenize(text, {
          language: getTranslation(goal?.translationId ?? 'web').languageCode,
        }).length;
        ({ memorized } = await applyTierCleared(chunk, session.tier, unitCount));
        // Tier 6 is the top of the ladder, so a clear that didn't seal the
        // chunk would otherwise reload into the identical Speak round. A
        // pass has banked today; an almost has not, so ask the attempts
        // whether a clean pass earlier today did, rather than assume it.
        const dayBanked =
          outcome.band === 'almost' &&
          !memorized &&
          (await awaitingSecondDay(
            { ...chunk, tier: Math.max(chunk.tier, session.tier), status: 'learning' },
            unitCount,
          ));
        standing = topTierStanding({
          tier: session.tier,
          band: outcome.band,
          memorized,
          dayBanked,
        });
        await clearActiveSession();
        const { refreshBadges } = await import('@/services/db/repos/badges');
        void refreshBadges();
        const { publishWidgetSnapshot } = await import('@/services/widgets');
        void publishWidgetSnapshot();
      }

      // Haptics per 07 §8: pass = success, tier-up = medium, memorized =
      // success ×2, almost = warning, miss = soft buzz.
      if (memorized) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(
          () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
          300,
        );
      } else if (outcome.band === 'almost') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (outcome.tierCleared) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (outcome.passed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // The session is swapped in with the feedback, not before: until then
      // the round stays on screen instead of a blank frame.
      setSession(outcome.state);
      setPhase({
        kind: 'feedback',
        accuracy: input.accuracy ?? (input.selfPass ? 1 : 0),
        passed: outcome.passed,
        band: outcome.band,
        slips: input.result ? slipCount(input.result) : null,
        tierCleared: outcome.tierCleared,
        memorized,
        sealsTomorrow: standing === 'sealsTomorrow',
        needsCleanPass: standing === 'needsCleanPass',
        // Only the clear that first lifts the chunk to the rest tier: a
        // session rebuilt at a lower tier passes through it again.
        restPoint: outcome.tierCleared && session.tier === REST_TIER && chunk.tier < REST_TIER,
        suggestDropTier: outcome.suggestDropTier,
        result: input.result,
      });
    },
    [session, chunk, text, roundStartedAt, goal?.translationId],
  );

  // One result per round: the round is still on screen while its attempt is
  // written, so a second tap on Check must not record it twice.
  const finishRound = useCallback(
    async (input: Parameters<typeof writeRound>[0]) => {
      if (finishing.current) return;
      finishing.current = true;
      try {
        await writeRound(input);
      } finally {
        finishing.current = false;
      }
    },
    [writeRound],
  );

  /** Ends the session on its summary (docs/03 §8) rather than just closing. */
  const finishSession = useCallback(async () => {
    if (phase.kind !== 'feedback' || !session || !chunk) return;
    const streak = await currentStreakDisplay();
    setPhase({
      kind: 'summary',
      standing: phase.memorized ? 6 : Math.max(chunk.tier, phase.tierCleared ? session.tier : -1),
      sealsTomorrow: phase.sealsTomorrow,
      needsCleanPass: phase.needsCleanPass,
      memorized: phase.memorized,
      streak: streak.current,
    });
  }, [phase, session, chunk]);

  const continueSession = useCallback(async () => {
    if (phase.kind !== 'feedback') return;
    if (phase.sealsTomorrow) {
      await finishSession();
    } else if (phase.needsCleanPass) {
      // Speak again, by choice: nothing is banked, so a reload would serve
      // this same round anyway — but silently, and only if this chunk is
      // still the one the goal hands back.
      if (!session) return;
      const next = retryTier(session, Date.now());
      setSession(next);
      await saveActiveSession(next);
      setPhase({ kind: 'round' });
      setRoundStartedAt(Date.now());
    } else if (phase.tierCleared) {
      // Reload: next tier for this chunk, or the next chunk.
      setPhase({ kind: 'loading' });
      await load();
    } else {
      setPhase({ kind: 'round' });
      setRoundStartedAt(Date.now());
    }
  }, [phase, session, load, finishSession]);

  /** The "rebuild the foundation" escape (docs/03 §1) — session-local, so
   * the chunk keeps its highest cleared tier and nothing is lost. */
  const dropToLowerTier = useCallback(async () => {
    if (!session) return;
    const next = dropTier(session);
    setSession(next);
    await saveActiveSession(next);
    setPhase({ kind: 'round' });
    setRoundStartedAt(Date.now());
  }, [session]);

  if (phase.kind === 'loading') {
    return <View style={[styles.root, { backgroundColor: colors.surface }]} />;
  }

  const reference = chunk
    ? formatRange({
        start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
        end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
      })
    : '';

  // Feedback for the almost band (docs/03 §3), and for a pass that leaned on
  // the error budget — the score alone would not say a slip was let through.
  const almost = phase.kind === 'feedback' && phase.band === 'almost';
  // Type and Speak are the tiers that count toward Memorized (docs/03 §1);
  // an almost at Type moves on to Speak without banking the day.
  const almostAtType =
    almost && !!session && phase.tierCleared && session.tier === 5 && !phase.memorized;
  const forgiven =
    phase.kind === 'feedback' && phase.band === 'pass' && phase.accuracy < 1
      ? phase.slips === null
        ? t('feedback.slipForgiven')
        : t('feedback.slipsForgiven', { count: phase.slips })
      : null;

  // The round itself; on extra-wide windows it shares the row with the rail.
  const round = (
    // Keyed by phase so each screen opens at its top: at large text sizes
    // the feedback scrolls, and the summary must not inherit that offset.
    <KeyboardScroll
      key={phase.kind}
      style={styles.flex}
      contentContainerStyle={[styles.content, contentColumn]}>
      {phase.kind === 'error' && (
        <>
          <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {phase.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>{t('common:done')}</Text>
          </Pressable>
        </>
      )}

      {phase.kind === 'sealsTomorrow' && (
        <>
          <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {t('restingTitle', { reference })}
          </Text>
          <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('restingBody', { tier: tierName(6) })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>{t('common:done')}</Text>
          </Pressable>
        </>
      )}

      {phase.kind === 'round' && session && chunk && (
        <>
          <LadderProgress progress={ladderProgress(session)} current />
          <Text style={[styles.reference, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('round.header', { reference, tier: tierName(session.tier) })}
          </Text>
          {/* Type seals as well as Speak (03 §1), so a session rebuilt one
              tier down still says so; lower than that it cannot. */}
          {sealing && session.tier >= 5 && (
            <Text style={[styles.sealNote, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('round.sealingNote', { reference })}
            </Text>
          )}
          <RoundBody
            key={`${session.roundIndex}-${session.attemptNo}`}
            session={session}
            text={text}
            reference={reference}
            translationId={goal?.translationId ?? 'web'}
            onFinish={finishRound}
          />
        </>
      )}

      {phase.kind === 'feedback' && session && (
        <>
          <LadderProgress
            progress={ladderProgress(session, { lastRoundOwed: phase.needsCleanPass })}
            current={false}
          />
          <Text
            accessibilityLabel={t('feedback.accuracyLabel', {
              value: Math.round(phase.accuracy * 100),
            })}
            style={[
              styles.accuracy,
              short && styles.accuracyShort,
              {
                // Amber for an almost: it moved on, but it was not a pass.
                // Gold only when the verse was just memorized.
                color: phase.memorized
                  ? colors.gold
                  : almost
                    ? colors.amber
                    : phase.passed
                      ? colors.success
                      : colors.error,
                fontFamily: fonts?.scripture,
              },
            ]}>
            {t('common:percent', { value: Math.round(phase.accuracy * 100) })}
          </Text>
          {/* The dissolve marks a clean clear; an almost shows its slips. */}
          {phase.tierCleared && !almost && (
            <Dissolution
              text={text}
              reference={reference}
              memorized={phase.memorized}
              compact={short}
            />
          )}
          <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {phase.memorized
              ? t('feedback.memorized')
              : almost
                ? phase.needsCleanPass
                  ? t('feedback.almostNotClean')
                  : phase.result
                    ? t('feedback.almostMarked')
                    : t('feedback.almostMoveOn')
                : phase.tierCleared
                  ? forgiven
                    ? t('feedback.tierClearedForgiven', { tier: tierName(session.tier), forgiven })
                    : t('feedback.tierCleared', { tier: tierName(session.tier) })
                  : phase.passed
                    ? forgiven
                      ? t('feedback.passedForgiven', { forgiven })
                      : t('feedback.roundPassed')
                    : phase.result
                      ? t('feedback.notQuiteMarked')
                      : t('feedback.notQuiteRetry')}
          </Text>
          {phase.result && (almost || !phase.tierCleared) && (
            <WordFeedback result={phase.result} tone={almost ? 'almost' : 'error'} />
          )}
          {phase.sealsTomorrow && (
            <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {almost ? t('feedback.sealsTomorrowAlmost') : t('feedback.sealsTomorrowPass')}
            </Text>
          )}
          {phase.needsCleanPass && (
            <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('feedback.needsCleanPass', { reference })}
            </Text>
          )}
          {almostAtType && (
            <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('feedback.almostAtType', { tier: tierName(nextTier(session.tier)) })}
            </Text>
          )}
          {phase.restPoint && (
            <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('feedback.restPoint', {
                first: tierName(REST_TIER + 1),
                second: tierName(REST_TIER + 2),
                third: tierName(REST_TIER + 3),
              })}
            </Text>
          )}
          {phase.suggestDropTier && (
            <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('feedback.suggestDrop', { tier: tierName(session.tier) })}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => void (phase.restPoint ? finishSession() : continueSession())}
            style={[
              styles.primaryButton,
              short && styles.primaryButtonShort,
              { backgroundColor: colors.lapis },
            ]}>
            <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>
              {phase.sealsTomorrow
                ? t('feedback.finish')
                : phase.needsCleanPass
                  ? t('common:retry')
                  : phase.restPoint
                    ? t('feedback.doneForToday')
                    : phase.tierCleared
                      ? t('common:continue')
                      : phase.passed
                        ? t('feedback.nextRound')
                        : t('common:retry')}
            </Text>
          </Pressable>
          {phase.restPoint && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={t('feedback.keepGoingHint', { tier: tierName(REST_TIER + 1) })}
              onPress={() => void continueSession()}
              style={styles.secondaryButton}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.lapis, fontFamily: fonts?.ui },
                ]}>
                {t('feedback.keepGoing')}
              </Text>
            </Pressable>
          )}
          {phase.needsCleanPass && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={t('feedback.stopForTodayHint', { tier: tierName(6) })}
              onPress={() => void finishSession()}
              style={styles.secondaryButton}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.lapis, fontFamily: fonts?.ui },
                ]}>
                {t('feedback.stopForToday')}
              </Text>
            </Pressable>
          )}
          {phase.suggestDropTier && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={t('feedback.rebuildHint')}
              onPress={() => void dropToLowerTier()}
              style={styles.secondaryButton}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.lapis, fontFamily: fonts?.ui },
                ]}>
                {t('feedback.rebuildAt', { tier: tierName(Math.max(0, session.tier - 1)) })}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {phase.kind === 'summary' && (
        <SessionSummary
          reference={reference}
          log={log}
          standing={phase.standing}
          sealsTomorrow={phase.sealsTomorrow}
          needsCleanPass={phase.needsCleanPass}
          memorized={phase.memorized}
          streak={phase.streak}
          // Beside the rail the ladder is already on screen.
          showLadder={!railShown}
        />
      )}
    </KeyboardScroll>
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {/* Native bar: Close at the top of the vertical axis. Progress lives in
          the content, where a bar spanning the whole ladder has room. */}
      <ScreenHeader backHidden title={t('title')}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={closeIcon}
            accessibilityLabel={t('closeLabel')}
            onPress={() => router.back()}>
            {t('common:close')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <View style={styles.flex}>
        {/* The rail stays for the summary and shows where the verse ended up,
            so the two panes hold still and a half-folded iPhone Duo keeps its
            crease in the gutter instead of under a centred column. */}
        {showRail && session && chunk && goal ? (
          <FoldAwareRow fill>
            {round}
            <View style={styles.rail}>
              <Card>
                <Text
                  style={[styles.railTitle, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                  {reference}
                </Text>
                <Text style={[styles.railSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {goal.title} · {getTranslation(goal.translationId).abbrev}
                </Text>
                <Text style={[styles.railSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {chunkProgressLabel(
                    phase.kind === 'summary' ? { ...chunk, tier: phase.standing } : chunk,
                    totalChunks,
                  )}
                </Text>
                <View style={styles.railLadder}>
                  <TierLadder
                    // `chunk` is as loaded; a tier cleared on this screen counts.
                    highestCleared={
                      phase.kind === 'summary'
                        ? phase.standing
                        : phase.kind === 'feedback' && phase.tierCleared
                          ? Math.max(chunk.tier, session.tier)
                          : chunk.tier
                    }
                    current={phase.kind === 'summary' ? undefined : session.tier}
                  />
                </View>
              </Card>
            </View>
          </FoldAwareRow>
        ) : (
          round
        )}
      </View>
    </View>
  );
}

function RoundBody({
  session,
  text,
  reference,
  translationId,
  onFinish,
}: {
  session: SessionState;
  text: string;
  reference: string;
  translationId: string;
  onFinish: (input: {
    accuracy?: number;
    selfPass?: boolean;
    missedWords?: string[];
    result?: GradeResult;
  }) => void;
}) {
  const mode = currentMode(session);
  switch (mode) {
    case 'read':
      return <ReadRound text={text} onDone={() => onFinish({ selfPass: true })} />;
    case 'firstLetters':
      return <FirstLettersRound text={text} onResult={(selfPass) => onFinish({ selfPass })} />;
    case 'blanks25':
    case 'blanks50':
    case 'blanks75':
      return (
        <BlanksRound
          text={text}
          density={blanksDensity(mode)}
          chunkId={session.chunkId}
          attemptNo={session.attemptNo}
          onDone={(o) => onFinish(o)}
        />
      );
    case 'arrange':
      return (
        <ArrangeRound
          text={text}
          chunkId={session.chunkId}
          attemptNo={session.attemptNo}
          onDone={(o) => onFinish(o)}
        />
      );
    case 'type':
      return (
        <TypeRound
          text={text}
          reference={reference}
          translationId={translationId}
          onDone={(o) => onFinish(o)}
        />
      );
    case 'speak':
      return (
        <SpeakRound
          text={text}
          reference={reference}
          translationId={translationId}
          onDone={(o) => onFinish(o)}
        />
      );
  }
}

/** Session summary (docs/03 §8): what was done, where the verse stands on
 * the ladder, the streak, and what comes next. */
function SessionSummary({
  reference,
  log,
  standing,
  sealsTomorrow,
  needsCleanPass,
  memorized,
  streak,
  showLadder,
}: {
  reference: string;
  log: { accuracy: number | null; passed: boolean }[];
  standing: number;
  sealsTomorrow: boolean;
  needsCleanPass: boolean;
  memorized: boolean;
  streak: number;
  /** Off on wide windows, where the rail beside the summary has the ladder. */
  showLadder: boolean;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation(['practice', 'common']);
  const steps = log.filter((r) => r.passed).length;
  const graded = log.filter((r) => r.accuracy !== null);
  const accuracy =
    graded.length > 0
      ? Math.round((graded.reduce((n, r) => n + (r.accuracy ?? 0), 0) / graded.length) * 100)
      : null;
  const stats: { label: string; value: string }[] = [
    { label: t('summary.stepsDone', { count: steps }), value: String(steps) },
    ...(accuracy === null
      ? []
      : [{ label: t('summary.accuracy'), value: t('common:percent', { value: accuracy }) }]),
    ...(streak > 0 ? [{ label: t('summary.dayStreak'), value: String(streak) }] : []),
  ];

  return (
    <>
      <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {memorized ? t('summary.memorized', { reference }) : t('feedback.doneForToday')}
      </Text>
      <View style={styles.summaryStats}>
        {stats.map((stat) => (
          <View key={stat.label} accessible accessibilityLabel={`${stat.value} ${stat.label}`}>
            <Text style={[styles.statValue, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      {showLadder && (
        <Card>
          <Text style={[styles.railSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {reference}
          </Text>
          <View style={styles.summaryLadder}>
            <TierLadder highestCleared={standing} />
          </View>
        </Card>
      )}
      {!memorized && (
        <Text style={[styles.suggestion, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {sealsTomorrow
            ? t('summary.sealsTomorrow')
            : needsCleanPass
              ? // Every rung reads cleared, so say what is still missing: the
                // almost moved the verse up, it did not count toward Memorized.
                t('summary.needsCleanPass', { reference, tier: tierName(nextTier(standing)) })
              : t('summary.pickUp', { tier: tierName(nextTier(standing)) })}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.primaryButton, { backgroundColor: colors.lapis }]}>
        <Text style={[styles.primaryButtonText, { fontFamily: fonts?.ui }]}>{t('common:done')}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  rail: {
    paddingRight: layout.screenMargin,
    paddingTop: layout.screenMargin,
  },
  railTitle: { fontSize: 22, lineHeight: 28 },
  railSub: { fontSize: 13, marginTop: spacing.xs },
  railLadder: { marginTop: spacing.lg },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xxl,
    rowGap: spacing.md,
    marginVertical: spacing.lg,
  },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 13 },
  summaryLadder: { marginTop: spacing.sm },
  content: {
    padding: layout.screenMargin,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  reference: { fontSize: 14, marginBottom: spacing.lg },
  // Sits under the reference line, inside the gap it leaves above the round.
  sealNote: { fontSize: 15, fontWeight: '600', marginTop: -spacing.md, marginBottom: spacing.lg },
  heading: { fontSize: 20, fontWeight: '600', marginVertical: spacing.md },
  accuracy: { fontSize: 56, marginTop: spacing.xl },
  accuracyShort: { fontSize: 44, marginTop: 0 },
  suggestion: { fontSize: 15, lineHeight: 20, marginTop: spacing.md },
  primaryButton: {
    marginTop: spacing.xxl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonShort: { marginTop: spacing.lg },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondaryButton: { marginTop: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});
