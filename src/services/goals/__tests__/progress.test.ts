import { describe, expect, it, vi } from 'vitest';

import type { Chunk, Goal } from '@/services/db/repos/goals';
import { goalAction, type GoalProgress } from '@/services/goals/progress';

// The repos open the database on import; only the pure half is under test.
// (vitest hoists these above the imports.)
vi.mock('@/services/db/repos/goals', () => ({ practicePlan: vi.fn() }));
vi.mock('@/services/db/repos/stitch', () => ({ stitchPlan: vi.fn() }));

const goal = { id: 'g1', title: 'John 3:16–17' } as Goal;
const chunk = {
  id: 'c1',
  orderIndex: 0,
  tier: 2,
  startBookId: 'John',
  startChapter: 3,
  startVerse: 16,
  endBookId: 'John',
  endChapter: 3,
  endVerse: 16,
} as Chunk;

const base: GoalProgress = {
  goal,
  chunk,
  step: { kind: 'continue', chunkId: 'c1', tier: 3 } as GoalProgress['step'],
  thenChunk: null,
  sealChunk: null,
  totalChunks: 2,
  stitchDue: false,
};

describe('goalAction', () => {
  it('names the next step and opens practice', () => {
    const action = goalAction(base);
    expect(action).toMatchObject({ kind: 'open', label: 'Continue', href: '/practice/g1' });
  });

  it('puts a due stitch ahead of the next chunk', () => {
    const action = goalAction({ ...base, stitchDue: true });
    expect(action).toMatchObject({ kind: 'open', label: 'Stitch', href: '/stitch/g1' });
  });

  it('sends a passage with only its stitch left to the stitch', () => {
    const action = goalAction({ ...base, chunk: null, step: null, stitchDue: true });
    expect(action).toMatchObject({ kind: 'open', href: '/stitch/g1' });
  });

  it('gives a resting verse a status, not something to open', () => {
    const action = goalAction({
      ...base,
      step: { kind: 'rest', chunkId: 'c1', tier: 6 } as GoalProgress['step'],
    });
    expect(action).toMatchObject({ kind: 'resting', label: 'Seals tomorrow' });
    expect(action).not.toHaveProperty('href');
  });

  it('offers nothing when every chunk is memorized and no stitch is due', () => {
    expect(goalAction({ ...base, chunk: null, step: null })).toBeNull();
  });
});
