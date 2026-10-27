/**
 * Which goals may be deleted, and what the confirmation says (Library).
 * Pure.
 *
 * Deleting is for stopping a passage in progress, never for losing
 * memorized Scripture: a goal may go only while it is active and none of its
 * chunks is memorized. So a deleted goal never had a review schedule, and
 * "verses memorized" never drops. What goes is its practice history (its
 * attempts). The streak and earned badges are stored on their own and are
 * not recomputed from attempts, and the days practiced are kept
 * (services/stats/practice-days), so the copy can promise they stay.
 */
import { t } from '@/i18n';

export type DeletionCandidate = { status: string };

export function mayDeleteGoal(
  goal: DeletionCandidate,
  chunks: readonly DeletionCandidate[],
): boolean {
  return goal.status === 'active' && chunks.every((c) => c.status !== 'memorized');
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
