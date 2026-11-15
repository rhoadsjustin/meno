import { useCallback } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import type { GoalMenuProps } from '@/features/goals/GoalMenu';
import { removeGoal, stopPassage } from '@/features/goals/remove-goal';
import { useTranslation } from '@/i18n/react';
import type { Chunk, Goal } from '@/services/db/repos/goals';
import { deleteGoalPrompt, goalRemoval, stopGoalPrompt } from '@/services/goals/deletion';

/**
 * Delete or Stop for a passage card's More menu, the same on every screen
 * that lists passages. Memorized Scripture is never deleted
 * (services/goals/deletion): with nothing memorized yet the passage is
 * deleted; partway through it is stopped, keeping what is memorized.
 * `reload` re-reads the screen once the passage is gone (or failed to go).
 */
export function useGoalRemoval(reload: () => Promise<unknown>) {
  const { t } = useTranslation('library');

  const remove = useCallback(
    async (goal: Goal) => {
      try {
        await removeGoal(goal.id);
        AccessibilityInfo.announceForAccessibility(t('remove.delete.done', { title: goal.title }));
      } catch {
        Alert.alert(t('remove.delete.failed', { title: goal.title }), t('remove.tryAgain'));
      } finally {
        await reload();
      }
    },
    [reload, t],
  );

  const stop = useCallback(
    async (goal: Goal) => {
      try {
        await stopPassage(goal.id);
        AccessibilityInfo.announceForAccessibility(t('remove.stop.done', { title: goal.title }));
      } catch {
        Alert.alert(t('remove.stop.failed', { title: goal.title }), t('remove.tryAgain'));
      } finally {
        await reload();
      }
    },
    [reload, t],
  );

  return (goal: Goal, chunks: Chunk[]): GoalMenuProps['removal'] => {
    switch (goalRemoval(goal, chunks)) {
      case 'delete':
        return {
          kind: 'delete',
          prompt: deleteGoalPrompt(goal.title),
          onConfirm: () => void remove(goal),
        };
      case 'stop':
        return {
          kind: 'stop',
          prompt: stopGoalPrompt(goal.title),
          onConfirm: () => void stop(goal),
        };
      default:
        return undefined;
    }
  };
}
