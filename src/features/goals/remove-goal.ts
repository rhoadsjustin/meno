import { chunksForGoal, deleteGoal, getGoal, stopGoal } from '@/services/db/repos/goals';
import { mayDeleteGoal, mayStopGoal } from '@/services/goals/deletion';
import { rescheduleAll } from '@/services/notifications';
import { publishWidgetSnapshot } from '@/services/widgets';

/**
 * Deletes a passage in progress (repos/goals `deleteGoal`) and resolves once
 * it is gone from the database, so the screen can redraw. Refuses a goal
 * that is finished or has any chunk memorized (services/goals
 * `mayDeleteGoal`): memorized Scripture is never deleted.
 *
 * Then, without holding the screen up, it refreshes everything outside the
 * database that may still show or schedule the goal:
 *
 * - the widgets, which hold the focus verse — for ESV, its text — in the App
 *   Group until the next publish. A publish already running finishes first
 *   and then publishes again (services/widgets), which can take a while the
 *   first time after launch;
 * - the recite-to-unlock shield, which asks for the focus verse. It moves to
 *   the next focus goal, or to the plain "Recite your verse to continue."
 *   when none is left. Override is the shield's own action and works either
 *   way (04 §6);
 * - scheduled reminders and pop quizzes, which are planned from the goals
 *   and reviews that remain.
 *
 * Each of these is best-effort and also runs on the next foreground.
 */
export async function removeGoal(goalId: string): Promise<void> {
  const [goal, chunks] = await Promise.all([getGoal(goalId), chunksForGoal(goalId)]);
  if (!goal || !mayDeleteGoal(goal, chunks)) {
    throw new Error('Only a passage in progress with nothing memorized can be deleted');
  }
  await deleteGoal(goalId);
  void refreshOutsideDatabase();
}

/**
 * Stops a passage that is partly memorized (repos/goals `stopGoal`): its
 * memorized chunks stay on the Memorized shelf and in reviews, the rest goes.
 * Resolves once the database is done, then refreshes the widgets, the shield
 * and notifications as `removeGoal` does — the stopped passage may have been
 * the focus. Refuses a goal that is not in progress, has nothing memorized
 * (delete it instead) or has everything memorized (services/goals
 * `mayStopGoal`).
 */
export async function stopPassage(goalId: string): Promise<void> {
  const [goal, chunks] = await Promise.all([getGoal(goalId), chunksForGoal(goalId)]);
  if (!goal || !mayStopGoal(goal, chunks)) {
    throw new Error('Only a passage in progress with some verses memorized can be stopped');
  }
  await stopGoal(goalId);
  void refreshOutsideDatabase();
}

/** Independent of each other, so a slow widget publish never holds up the shield. */
async function refreshOutsideDatabase(): Promise<void> {
  await Promise.all([publishWidgetSnapshot(), refreshShield(), rescheduleAll()]);
}

async function refreshShield(): Promise<void> {
  try {
    const { refreshShieldForCurrentVerse } = await import('@/services/lock');
    await refreshShieldForCurrentVerse();
  } catch {
    // The shield also refreshes on every foreground.
  }
}
