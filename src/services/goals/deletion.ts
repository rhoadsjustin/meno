/**
 * Taking a passage off the In progress shelf (Library), and what the
 * confirmation says. Pure.
 *
 * Memorized Scripture is never deleted, so there are two ways off the shelf:
 *
 * - **Delete**, while the goal is active and none of its chunks is
 *   memorized. The whole goal goes. It never had a review schedule, and
 *   "verses memorized" never drops. What goes is its practice history (its
 *   attempts).
 * - **Stop**, once some chunks are memorized and some are not. The chunks
 *   not yet memorized go, with their attempts; the memorized ones stay on
 *   the Memorized shelf with their review items and attempts, and the goal
 *   becomes `stopped` (repos/goals `stopGoal`).
 *
 * Either way the streak and earned badges are stored on their own and are
 * not recomputed from attempts, and the days practiced are kept
 * (services/stats/practice-days), so the copy can promise they stay.
 *
 * A goal whose chunks are all memorized offers neither: only its final
 * stitch is left, and stopping it would remove nothing.
 */
import { t } from '@/i18n';

export type DeletionCandidate = { status: string };

const isMemorized = (c: DeletionCandidate) => c.status === 'memorized';

export function mayDeleteGoal(
  goal: DeletionCandidate,
  chunks: readonly DeletionCandidate[],
): boolean {
  return goal.status === 'active' && !chunks.some(isMemorized);
}

export function mayStopGoal(
  goal: DeletionCandidate,
  chunks: readonly DeletionCandidate[],
): boolean {
  return goal.status === 'active' && chunks.some(isMemorized) && !chunks.every(isMemorized);
}

/** What the card's trash button does for this goal, if it shows one. */
export function goalRemoval(
  goal: DeletionCandidate,
  chunks: readonly DeletionCandidate[],
): 'delete' | 'stop' | null {
  if (mayDeleteGoal(goal, chunks)) return 'delete';
  if (mayStopGoal(goal, chunks)) return 'stop';
  return null;
}

/** The chunks stopping a goal removes: everything not memorized. */
export function chunksToDropOnStop<T extends DeletionCandidate>(chunks: readonly T[]): T[] {
  return chunks.filter((c) => !isMemorized(c));
}

export type DeletePrompt = {
  title: string;
  message: string;
  /** The destructive button; the system adds Cancel. */
  confirm: string;
};

export function deleteGoalPrompt(goalTitle: string): DeletePrompt {
  return {
    title: t('library:remove.delete.title', { title: goalTitle }),
    message: t('library:remove.delete.message'),
    confirm: t('library:remove.delete.confirm'),
  };
}

export function stopGoalPrompt(goalTitle: string): DeletePrompt {
  return {
    title: t('library:remove.stop.title', { title: goalTitle }),
    message: t('library:remove.stop.message'),
    confirm: t('library:remove.stop.confirm'),
  };
}
