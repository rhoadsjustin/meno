/**
 * Challenge sharing (docs/06 §5, backendless slice): a goal becomes a
 * challenge the first time it is shared — it gains a stable code in
 * `goals.challengeId`, and the link recreates the same goal on the friend's
 * device. No server, no accounts; M8's Supabase board attaches to the same
 * codes later.
 */
import * as Crypto from 'expo-crypto';
import { Share } from 'react-native';

import { getGoal, setGoalChallengeId, type Goal } from '@/services/db/repos/goals';
import { challengeShareMessage, toIsoDate, type Challenge } from '@/services/challenges/codec';

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

/** Opens the system share sheet with the challenge invitation. */
export async function shareGoalChallenge(goal: Goal): Promise<void> {
  const challenge = await challengeForGoal(goal);
  await Share.share(
    { message: challengeShareMessage(challenge) },
    { subject: `Meno challenge: ${challenge.title}` }
  );
}
