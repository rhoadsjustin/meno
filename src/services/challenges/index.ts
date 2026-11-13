/**
 * Challenge sharing (docs/06 §5, backendless slice): a goal becomes a
 * challenge the first time it is shared — it gains a stable code in
 * `goals.challengeId`, and the link recreates the same goal on the friend's
 * device. No server, no accounts; M8's Supabase board attaches to the same
 * codes later.
 */
import * as Crypto from 'expo-crypto';
import { Alert, Platform, Share } from 'react-native';

import { getGoal, setGoalChallengeId, type Goal } from '@/services/db/repos/goals';
import { t } from '@/i18n';
import {
  challengeShareContent,
  challengeShareSubject,
  toIsoDate,
  type Challenge,
} from '@/services/challenges/codec';

export * from '@/services/challenges/codec';

/** Unambiguous alphabet (no I/L/O/U/0/1) — codes may get read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 8;

export function newChallengeCode(): string {
  const bytes = Crypto.getRandomBytes(CODE_LENGTH);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/**
 * The goal's challenge, minting and persisting a code on first share so
 * every share of this goal reuses the same one.
 */
export async function challengeForGoal(staleGoal: Goal): Promise<Challenge> {
  // Re-read: the caller's row may predate a code minted by an earlier share.
  const goal = (await getGoal(staleGoal.id)) ?? staleGoal;
  let code = goal.challengeId;
  if (!code) {
    code = newChallengeCode();
    await setGoalChallengeId(goal.id, code);
  }
  return {
    code,
    translationId: goal.translationId,
    range: {
      start: { bookId: goal.startBookId, chapter: goal.startChapter, verse: goal.startVerse },
      end: { bookId: goal.endBookId, chapter: goal.endChapter, verse: goal.endVerse },
    },
    title: goal.title,
    ...(goal.targetDate ? { targetDate: toIsoDate(goal.targetDate) } : {}),
  };
}

/**
 * Opens the system share sheet with the challenge invitation. Rejects when
 * the code could not be saved or the sheet could not open; closing the sheet
 * without sharing is not a failure.
 */
export async function shareGoalChallenge(goal: Goal): Promise<void> {
  const challenge = await challengeForGoal(goal);
  await Share.share(challengeShareContent(challenge, Platform.OS), {
    subject: challengeShareSubject(challenge),
  });
}

/**
 * `shareGoalChallenge` for a button with nowhere of its own to show a
 * failure: an alert says the share did not happen, so a tap never does
 * nothing. Never rejects.
 */
export async function shareGoalChallengeOrAlert(goal: Goal): Promise<void> {
  try {
    await shareGoalChallenge(goal);
  } catch {
    Alert.alert(t('challenge:share.failedTitle'), t('challenge:share.failed'));
  }
}
