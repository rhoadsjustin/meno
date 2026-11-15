/**
 * Recite-to-unlock quiz (docs/04 §4): one job, minimal chrome. Speak by
 * default with an instant Type toggle, forgiving 85% threshold, one retry,
 * then Override offered prominently. Never traps the user (04 §6).
 *
 * Override is on screen, enabled, in every phase before the shields are
 * cleared: `unlockActions` (services/lock/unlock-flow.ts, unit-tested) says
 * where. While loading, reciting, typing and after a first miss it is the
 * text button in the top bar, where the keyboard cannot cover it; when the
 * quiz cannot start and after a second miss it is the screen's main button.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionFooter } from '@/components/action-footer';
import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { t as translate } from '@/i18n';
import { Button, MIN_TOUCH_TARGET } from '@/components/button';
import { KeyboardScroll } from '@/components/keyboard-scroll';
import { announce } from '@/components/screen-reader';
import { TextLink } from '@/components/text-link';
import { LoadingState } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import { formatRange, getPassage } from '@/services/bible';
import { activeGoal, chunksForGoal, currentChunk, type Chunk } from '@/services/db/repos/goals';
import { loadLockConfig, recordLockEvent } from '@/services/db/repos/lock';
import { secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import { recordAttempt } from '@/services/db/repos/attempts';
import { clearShields, registerUnlockMount, scheduleRelock } from '@/services/lock';
import { phaseAfterAttempt, unlockActions, type UnlockPhase } from '@/services/lock/unlock-flow';
import { SpeakRound, type SpeakOutcome } from '@/features/practice/rounds/SpeakRound';
import { useThemeColors, fonts, layout, spacing, displayType } from '@/theme';

/** A reason the quiz can't start, in words meant for the screen. */
class UnlockNotice extends Error {}

export function UnlockScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['lock', 'practice', 'common']);
  const { insets, sides } = useContentLayout();
  const [phase, setPhase] = useState<UnlockPhase>({ kind: 'loading' });
  const actions = unlockActions(phase);

  // The success state closes itself; if the screen is left first the timer
  // must not close whatever is on top by then.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The screen is left once: a second tap on Override, or Override just as
  // the success state closes, must not close the screen underneath as well.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    try {
      closeModal();
    } catch {
      // Not gone after all: leave the buttons working.
      left.current = false;
    }
  }, []);
  // A passed recitation is recorded once, however often Check is tapped.
  const unlocking = useRef(false);
  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  // The quiz is replaced by its result in place: tell VoiceOver what happened.
  useEffect(() => {
    if (phase.kind !== 'failed' && phase.kind !== 'success') return;
    const score = t('practice:feedback.accuracyLabel', { value: Math.round(phase.accuracy * 100) });
    const message =
      phase.kind === 'success'
        ? t('unlock.success')
        : phase.attempt === 1
          ? t('unlock.missedRetry')
          : t('unlock.missedFinal');
    announce(`${score}. ${message}`);
  }, [phase, t]);

  // Single-instance guard: while mounted, presentUnlock() is a no-op.
  useEffect(() => registerUnlockMount(), []);
  const [verse, setVerse] = useState<{
    chunk: Chunk | null;
    reference: string;
    text: string;
    translationId: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadLockConfig();
        const goal = await activeGoal();
        // The last passage in progress was finished or deleted while the
        // shield was up: say so, and leave unlocking one tap away (04 §6).
        if (!goal) throw new UnlockNotice(translate('lock:unlock.errorNoGoal'));
        // Verse source (04 §1.3): current chunk, or a random memorized one;
        // fall back to the current chunk when nothing is memorized (04 §7).
        let chunk: Chunk | null = null;
        if (config.verseSource === 'randomMemorized') {
          const memorized = (await chunksForGoal(goal.id)).filter((c) => c.status === 'memorized');
          if (memorized.length > 0) {
            chunk = memorized[Math.floor(Math.random() * memorized.length)];
          }
        }
        chunk ??= (await currentChunk(goal.id)) ?? null;
        if (!chunk) throw new UnlockNotice(translate('lock:unlock.errorNothingToRecite'));
        const range = {
          start: {
            bookId: chunk.startBookId,
            chapter: chunk.startChapter,
            verse: chunk.startVerse,
          },
          end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
        };
        const verses = await getPassage(goal.translationId, range);
        setVerse({
          chunk,
          reference: formatRange(range),
          text: verses.map((v) => v.text).join(' '),
          translationId: goal.translationId,
        });
        setPhase({ kind: 'quiz', attempt: 1 });
      } catch (e) {
        // Only our own notices are shown; any other failure (a passage that
        // didn't load) gets a plain sentence, and Override still works.
        setPhase({
          kind: 'error',
          message: e instanceof UnlockNotice ? e.message : translate('common:passageUnavailable'),
        });
      }
    })();
  }, []);

  const unlock = useCallback(
    async (accuracy: number) => {
      if (unlocking.current) return;
      unlocking.current = true;
      try {
        clearShields();
      } catch {
        // The shields could not be cleared: say so, with Override as the
        // main button, rather than leave a passed recitation unanswered.
        unlocking.current = false;
        setPhase({ kind: 'error', message: t('unlock.errorClear') });
        return;
      }
      // The shields are down. Nothing in the bookkeeping below may keep the
      // user on the quiz, so a failure there still ends in the success state.
      try {
        const config = await loadLockConfig();
        if (config.mode === 'everyPickup') {
          await scheduleRelock(config.relockMinutes ?? 30);
        }
        await recordLockEvent({
          type: 'reciteSuccess',
          verseChunkId: verse?.chunk?.id,
          accuracy,
        });
        if (verse?.chunk) {
          await recordAttempt({
            chunkId: verse.chunk.id,
            mode: 'speak',
            accuracy,
            durationMs: 0,
            missedWords: [],
            source: 'unlock',
          });
        }
        // Recite-to-unlock counts toward the streak (04 §4).
        if ((await secureToday()).daySecured) void rescheduleAll();
        const { refreshBadges } = await import('@/services/db/repos/badges');
        void refreshBadges();
      } catch (e) {
        if (__DEV__) console.warn('Unlock bookkeeping failed', e);
      }
      // Override was tapped meanwhile: the screen is already closing.
      if (left.current) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase({ kind: 'success', accuracy });
      // Brief success (<1.5s), then out of the way (04 §4).
      dismissTimer.current = setTimeout(leave, 1400);
    },
    [verse, leave, t],
  );

  // Override (04 §6) depends on nothing that can fail or wait: the shields
  // are cleared and the screen closes in the same tick, whatever the phase —
  // a load that never finishes, a microphone mid-take, a database error. The
  // log entry follows on its own.
  const override = useCallback(() => {
    try {
      clearShields();
    } catch {
      // Still leave: "Turn off and clear all shields now" is in Settings.
    }
    void recordLockEvent({ type: 'override', verseChunkId: verse?.chunk?.id }).catch(() => {});
    leave();
  }, [verse, leave]);

  const onRoundDone = useCallback(
    (outcome: SpeakOutcome) => {
      if (phase.kind !== 'quiz') return;
      const next = phaseAfterAttempt(phase.attempt, outcome.accuracy);
      if (next.kind === 'success') {
        void unlock(outcome.accuracy);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPhase(next);
      }
    },
    [phase, unlock],
  );

  const footer = actions.retry || actions.keepTrying || actions.override === 'prominent';

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* The bar is outside the scroll view and above it, so it stays put
          when the quiz scrolls and when the keyboard is up. */}
      <View style={styles.bar}>
        {actions.override === 'quiet' && (
          <TextLink
            tone="quiet"
            size="large"
            label={t('unlock.override')}
            onPress={override}
            testID="unlock-override"
            style={styles.override}
          />
        )}
      </View>

      <KeyboardScroll style={styles.scroll} contentContainerStyle={[styles.content, contentColumn]}>
        {phase.kind === 'loading' && <LoadingState layout="inline" />}

        {phase.kind === 'error' && (
          <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {phase.message}
          </Text>
        )}

        {phase.kind === 'quiz' && verse && (
          <SpeakRound
            key={phase.attempt}
            text={verse.text}
            reference={verse.reference}
            translationId={verse.translationId}
            onDone={onRoundDone}
          />
        )}

        {phase.kind === 'failed' && (
          <>
            <Text
              accessibilityLabel={t('practice:feedback.accuracyLabel', {
                value: Math.round(phase.accuracy * 100),
              })}
              style={[styles.accuracy, { color: colors.error, fontFamily: fonts?.scripture }]}>
              {t('common:percent', { value: Math.round(phase.accuracy * 100) })}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {actions.retry ? t('unlock.missedRetry') : t('unlock.missedFinal')}
            </Text>
          </>
        )}

        {phase.kind === 'success' && (
          <>
            <Text
              accessibilityLabel={t('practice:feedback.accuracyLabel', {
                value: Math.round(phase.accuracy * 100),
              })}
              style={[styles.accuracy, { color: colors.gold, fontFamily: fonts?.scripture }]}>
              {t('common:percent', { value: Math.round(phase.accuracy * 100) })}
            </Text>
            <Text style={[styles.body, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('unlock.success')}
            </Text>
          </>
        )}
      </KeyboardScroll>

      {/* Phases with no text field, so the pinned footer is never behind the
          keyboard. On a short window the actions stay on screen. */}
      {footer && (
        <ActionFooter>
          {actions.retry && (
            <Button
              label={t('common:retry')}
              onPress={() =>
                setPhase((p) => (p.kind === 'failed' ? { kind: 'quiz', attempt: p.attempt + 1 } : p))
              }
            />
          )}
          {/* After a second miss, or when the quiz cannot start, Override is
              the prominent path — never a failed-quiz loop (04 §4). */}
          {actions.override === 'prominent' && (
            <Button label={t('unlock.override')} onPress={override} testID="unlock-override" />
          )}
          {actions.keepTrying && (
            <Button
              variant="plain"
              label={t('unlock.keepTrying')}
              onPress={() =>
                setPhase((p) => (p.kind === 'failed' ? { kind: 'quiz', attempt: p.attempt + 1 } : p))
              }
            />
          )}
        </ActionFooter>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  // The bar keeps its height in every phase, so the content does not jump
  // when Override moves to the footer.
  bar: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: layout.screenMargin - spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: layout.screenMargin,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  body: { fontSize: 16, lineHeight: 22, marginTop: spacing.lg },
  accuracy: { fontSize: displayType.medium, marginTop: spacing.xl },
  // Padded past the label on every side: the override is never a small
  // thing to hit (04 §6).
  override: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
