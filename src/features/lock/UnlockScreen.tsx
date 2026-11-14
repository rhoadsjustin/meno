/**
 * Recite-to-unlock quiz (docs/04 §4): one job, minimal chrome. Speak by
 * default with an instant Type toggle, forgiving 85% threshold, one retry,
 * then Override offered prominently. Never traps the user (04 §6).
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { t as translate } from '@/i18n';
import { Button } from '@/components/button';
import { announce } from '@/components/screen-reader';
import { TextLink } from '@/components/text-link';
import { useTranslation } from '@/i18n/react';
import { formatRange, getPassage } from '@/services/bible';
import { activeGoal, chunksForGoal, currentChunk, type Chunk } from '@/services/db/repos/goals';
import { loadLockConfig, recordLockEvent } from '@/services/db/repos/lock';
import { secureToday } from '@/services/db/repos/streaks';
import { rescheduleAll } from '@/services/notifications';
import { recordAttempt } from '@/services/db/repos/attempts';
import { clearShields, registerUnlockMount, scheduleRelock } from '@/services/lock';
import { SpeakRound, type SpeakOutcome } from '@/features/practice/rounds/SpeakRound';
import { useThemeColors, fonts, layout, spacing, displayType } from '@/theme';

/** A reason the quiz can't start, in words meant for the screen. */
class UnlockNotice extends Error {}

/** Forgiving threshold — friction-with-grace, not an exam (04 §4). */
const UNLOCK_THRESHOLD = 0.85;

type Phase =
  | { kind: 'loading' }
  | { kind: 'quiz'; attempt: number }
  | { kind: 'failed'; attempt: number; accuracy: number }
  | { kind: 'success'; accuracy: number }
  | { kind: 'error'; message: string };

export function UnlockScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['lock', 'practice', 'common']);
  const { insets, sides } = useContentLayout();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  // The success state closes itself; if the screen is left first the timer
  // must not close whatever is on top by then.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        // didn't load) gets a plain sentence, and Unlock anyway still works.
        setPhase({
          kind: 'error',
          message: e instanceof UnlockNotice ? e.message : translate('common:passageUnavailable'),
        });
      }
    })();
  }, []);

  const unlock = useCallback(
    async (accuracy: number) => {
      const config = await loadLockConfig();
      clearShields();
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase({ kind: 'success', accuracy });
      // Brief success (<1.5s), then out of the way (04 §4).
      dismissTimer.current = setTimeout(closeModal, 1400);
    },
    [verse],
  );

  const override = useCallback(async () => {
    clearShields();
    await recordLockEvent({ type: 'override', verseChunkId: verse?.chunk?.id });
    closeModal();
  }, [verse]);

  const onRoundDone = useCallback(
    (outcome: SpeakOutcome) => {
      if (phase.kind !== 'quiz') return;
      if (outcome.accuracy >= UNLOCK_THRESHOLD) {
        void unlock(outcome.accuracy);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPhase({ kind: 'failed', attempt: phase.attempt, accuracy: outcome.accuracy });
      }
    },
    [phase, unlock],
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentColumn]}
        keyboardShouldPersistTaps="handled">
        {phase.kind === 'error' && (
          <>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {phase.message}
            </Text>
            <Button
              label={t('unlock.unlockAnyway')}
              onPress={() => void override()}
              style={styles.primary}
            />
          </>
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
              {phase.attempt === 1 ? t('unlock.missedRetry') : t('unlock.missedFinal')}
            </Text>
            {phase.attempt === 1 ? (
              <Button
                label={t('common:retry')}
                onPress={() => setPhase({ kind: 'quiz', attempt: 2 })}
                style={styles.primary}
              />
            ) : (
              // After a second miss, Override is the prominent path —
              // never a failed-quiz loop (04 §4).
              <Button
                label={t('unlock.unlockAnyway')}
                onPress={() => void override()}
                style={styles.primary}
              />
            )}
            {phase.attempt === 2 && (
              <Button
                variant="plain"
                label={t('unlock.keepTrying')}
                onPress={() => setPhase({ kind: 'quiz', attempt: 3 })}
              />
            )}
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
      </ScrollView>

      {(phase.kind === 'quiz' || phase.kind === 'error') && (
        <TextLink
          tone="quiet"
          label={t('unlock.override')}
          onPress={() => void override()}
          style={styles.override}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxxl, gap: spacing.sm },
  body: { fontSize: 16, lineHeight: 22, marginTop: spacing.lg },
  accuracy: { fontSize: displayType.medium, marginTop: spacing.xl },
  primary: { marginTop: spacing.xxl },
  // The whole strip under the quiz is the target: the override is never a
  // small thing to hit (04 §6).
  override: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
});
