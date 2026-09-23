import { describe, expect, it } from 'vitest';

import { resolveFocusGoal, type FocusCandidate } from '@/services/focus';

const goal = (id: string, day: number, status = 'active'): FocusCandidate => ({
  id,
  status,
  createdAt: new Date(2026, 8, day),
});

describe('resolveFocusGoal', () => {
  it('returns nothing when there are no goals', () => {
    expect(resolveFocusGoal([], null)).toBeUndefined();
  });

  it('falls back to the oldest active goal when nothing is picked', () => {
    const goals = [goal('b', 5), goal('a', 1), goal('c', 9)];
    expect(resolveFocusGoal(goals, null)?.id).toBe('a');
  });

  it('returns the picked goal while it is active', () => {
    const goals = [goal('a', 1), goal('b', 5)];
    expect(resolveFocusGoal(goals, 'b')?.id).toBe('b');
  });

  it('ignores a pick that has been completed or archived', () => {
    const goals = [goal('a', 3), goal('b', 1, 'completed'), goal('c', 2, 'archived')];
    expect(resolveFocusGoal(goals, 'b')?.id).toBe('a');
    expect(resolveFocusGoal(goals, 'c')?.id).toBe('a');
  });

  it('ignores a pick that no longer exists (deleted goal)', () => {
    const goals = [goal('a', 1), goal('b', 5)];
    expect(resolveFocusGoal(goals, 'gone')?.id).toBe('a');
  });

  it('never falls back to a goal that is not active', () => {
    const goals = [goal('old', 1, 'completed'), goal('new', 7)];
    expect(resolveFocusGoal(goals, null)?.id).toBe('new');
    expect(resolveFocusGoal([goal('x', 1, 'archived')], null)).toBeUndefined();
  });
});
