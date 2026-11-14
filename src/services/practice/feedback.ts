/**
 * What a finished round's result screen says and offers (docs/03 §1, §3, §8).
 * Pure: the screen records the round and hands over the facts; the heading
 * and each button's label are decided here together with what the button
 * does, so a state cannot be labelled one way and wired another.
 */
import { t } from '@/i18n';
import type { RoundBand } from '@/services/grading';
import { REST_TIER, tierName } from '@/services/practice/tiers';

export type FeedbackFacts = {
  /** False for Read and First Letters: completion and self-report carry no
   * score (03 §1), so none is shown or spoken. */
  graded: boolean;
  /** The honest score; meaningful only when `graded`. */
  accuracy: number;
  /** The round moved on: a pass or an almost. */
  passed: boolean;
  band: RoundBand;
  /** Slipped words in a graded text round; null where there is no word-level
   * result (self-report, Blanks, Arrange). */
  slips: number | null;
  /** The result marks the slipped words under the heading. */
  marked: boolean;
  tierCleared: boolean;
  memorized: boolean;
  /** Cleared the top tier without sealing: do not serve it again. */
  sealsTomorrow: boolean;
  /** Cleared the top tier on an almost with nothing banked today. */
  needsCleanPass: boolean;
  /** Just reached REST_TIER: offer to stop for the day. */
  restPoint: boolean;
  suggestDropTier: boolean;
};

/**
 * `next`: the next round, the next tier, or this round again. `finish`: the
 * session summary. `dropTier`: rebuild this chunk one tier lower.
 */
export type FeedbackAction = 'next' | 'finish' | 'dropTier';

export type FeedbackButton = { label: string; hint?: string; action: FeedbackAction };

export type FeedbackCopy = {
  /** The result's heading, also what VoiceOver is told. */
  heading: string;
  primary: FeedbackButton;
  /** Plain buttons under the primary, in order. */
  secondary: FeedbackButton[];
};

/** `tier` is the tier the round belonged to. */
export function describeFeedback(facts: FeedbackFacts, tier: number): FeedbackCopy {
  const almost = facts.band === 'almost';
  // A pass that leaned on the error budget — the score alone would not say
  // a slip was let through.
  const forgiven =
    facts.graded && facts.band === 'pass' && facts.accuracy < 1
      ? facts.slips === null
        ? t('practice:feedback.slipForgiven')
        : t('practice:feedback.slipsForgiven', { count: facts.slips })
      : null;

  const heading = facts.memorized
    ? t('practice:feedback.memorized')
    : almost
      ? facts.needsCleanPass
        ? t('practice:feedback.almostNotClean')
        : facts.marked
          ? t('practice:feedback.almostMarked')
          : t('practice:feedback.almostMoveOn')
      : facts.tierCleared
        ? forgiven
          ? t('practice:feedback.tierClearedForgiven', { tier: tierName(tier), forgiven })
          : t('practice:feedback.tierCleared', { tier: tierName(tier) })
        : facts.passed
          ? forgiven
            ? t('practice:feedback.passedForgiven', { forgiven })
            : t('practice:feedback.roundPassed')
          : facts.marked
            ? t('practice:feedback.notQuiteMarked')
            : t('practice:feedback.notQuiteRetry');

  // A memorized verse goes to the summary — its streak, its ladder and a
  // place to stop — rather than straight into the next verse.
  const primary: FeedbackButton = facts.memorized
    ? { label: t('common:continue'), action: 'finish' }
    : facts.sealsTomorrow || facts.restPoint
      ? { label: t('practice:feedback.doneForToday'), action: 'finish' }
      : facts.needsCleanPass
        ? { label: t('common:retry'), action: 'next' }
        : facts.passed
          ? { label: t('common:continue'), action: 'next' }
          : { label: t('common:retry'), action: 'next' };

  const secondary: FeedbackButton[] = [];
  if (!facts.memorized) {
    if (facts.restPoint) {
      secondary.push({
        label: t('practice:feedback.keepGoing'),
        hint: t('practice:feedback.keepGoingHint', { tier: tierName(REST_TIER + 1) }),
        action: 'next',
      });
    }
    if (facts.needsCleanPass) {
      secondary.push({
        label: t('practice:feedback.stopForToday'),
        hint: t('practice:feedback.stopForTodayHint', { tier: tierName(6) }),
        action: 'finish',
      });
    }
    if (facts.suggestDropTier) {
      secondary.push({
        label: t('practice:feedback.rebuildAt', { tier: tierName(Math.max(0, tier - 1)) }),
        hint: t('practice:feedback.rebuildHint'),
        action: 'dropTier',
      });
    }
  }
  return { heading, primary, secondary };
}
