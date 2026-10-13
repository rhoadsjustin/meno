import { describe, expect, it } from 'vitest';

import {
  daysAgo,
  describeStep,
  planPractice,
  stepFor,
  type ChunkStanding,
} from '@/services/practice';

const chunk = (
  orderIndex: number,
  tier: number,
  masteryDaysAgo: number[] = [],
  status?: ChunkStanding['status'],
): ChunkStanding => ({
  id: `c${orderIndex}`,
  orderIndex,
  tier,
  status: status ?? (tier < 0 ? 'active' : 'learning'),
  masteryDaysAgo,
});

describe('daysAgo', () => {
  const now = new Date(2026, 9, 13, 8, 0);

  it('counts local calendar days, not elapsed hours', () => {
    // 23:50 last night is yesterday even though it is only hours ago.
    expect(daysAgo([new Date(2026, 9, 12, 23, 50)], now)).toEqual([1]);
    expect(daysAgo([new Date(2026, 9, 13, 0, 5)], now)).toEqual([0]);
  });

  it('collapses several passes on one day and sorts nearest first', () => {
    const dates = [
      new Date(2026, 9, 10, 9),
      new Date(2026, 9, 12, 9),
      new Date(2026, 9, 12, 21),
      new Date(2026, 9, 13, 7),
    ];
    expect(daysAgo(dates, now)).toEqual([0, 1, 3]);
  });

  it('reads a pass stamped in the future as today', () => {
    expect(daysAgo([new Date(2026, 9, 14, 9)], now)).toEqual([0]);
  });
});

describe('stepFor', () => {
  it('has nothing for locked or memorized chunks', () => {
    expect(stepFor(chunk(0, -1, [], 'locked'))).toBeNull();
    expect(stepFor(chunk(0, 6, [0, 1], 'memorized'))).toBeNull();
  });

  it('starts an untouched chunk at Read', () => {
    expect(stepFor(chunk(0, -1))).toEqual({ kind: 'start', chunkId: 'c0', tier: 0 });
  });

  it('continues a climbing chunk at the tier after its highest cleared', () => {
    expect(stepFor(chunk(0, 3))).toEqual({ kind: 'continue', chunkId: 'c0', tier: 4 });
    // Type banked a mastery day, but Speak is still new ground.
    expect(stepFor(chunk(0, 5, [1]))).toEqual({ kind: 'continue', chunkId: 'c0', tier: 6 });
  });

  it('rests a chunk that topped the ladder today', () => {
    expect(stepFor(chunk(0, 6, [0]))).toEqual({ kind: 'rest', chunkId: 'c0' });
  });

  it('seals a chunk that topped the ladder on an earlier day', () => {
    expect(stepFor(chunk(0, 6, [1]))).toEqual({ kind: 'seal', chunkId: 'c0', tier: 6 });
    expect(stepFor(chunk(0, 6, [4]))?.kind).toBe('seal');
  });

  it('seals when a second day is already banked outside practice', () => {
    // Yesterday's Speak plus a recite-to-unlock pass today: two mastery
    // days, so one practice pass is all that is missing.
    expect(stepFor(chunk(0, 6, [0, 1]))?.kind).toBe('seal');
  });

  it('keeps serving Speak when the top tier has no mastery day at all', () => {
    expect(stepFor(chunk(0, 6, []))).toEqual({ kind: 'continue', chunkId: 'c0', tier: 6 });
  });
});

describe('planPractice', () => {
  it('has nothing once every chunk is memorized', () => {
    const plan = planPractice([chunk(0, 6, [1, 2], 'memorized')]);
    expect(plan).toEqual({ next: null, optionalSeal: null, then: null, steps: [] });
  });

  it('takes the lowest-order chunk with work, whatever order they arrive in', () => {
    const plan = planPractice([chunk(2, -1, [], 'locked'), chunk(1, -1), chunk(0, 3)]);
    expect(plan.next).toEqual({ kind: 'continue', chunkId: 'c0', tier: 4 });
    expect(plan.optionalSeal).toBeNull();
    expect(plan.steps.map((s) => s.chunkId)).toEqual(['c0', 'c1']);
  });

  it('day two: new work first, yesterday’s verse as an optional seal', () => {
    const plan = planPractice([chunk(0, 6, [1]), chunk(1, -1)]);
    expect(plan.next).toEqual({ kind: 'start', chunkId: 'c1', tier: 0 });
    expect(plan.optionalSeal).toEqual({ kind: 'seal', chunkId: 'c0', tier: 6 });
    expect(plan.then).toBeNull();
  });

  it('a seal left past its day of grace goes ahead of the new work', () => {
    const plan = planPractice([chunk(0, 6, [2]), chunk(1, 2)]);
    expect(plan.next).toEqual({ kind: 'seal', chunkId: 'c0', tier: 6 });
    expect(plan.optionalSeal).toBeNull();
    expect(plan.then).toEqual({ kind: 'continue', chunkId: 'c1', tier: 3 });
  });

  it('an overdue seal outranks a fresh one, which then waits its turn', () => {
    const plan = planPractice([chunk(0, 6, [1]), chunk(1, 6, [3]), chunk(2, -1)]);
    expect(plan.next?.chunkId).toBe('c1');
    expect(plan.optionalSeal).toBeNull();
    expect(plan.then?.chunkId).toBe('c2');
  });

  it('single chunk: the seal is simply next', () => {
    const plan = planPractice([chunk(0, 6, [1])]);
    expect(plan.next).toEqual({ kind: 'seal', chunkId: 'c0', tier: 6 });
    expect(plan.optionalSeal).toBeNull();
    expect(plan.then).toBeNull();
  });

  it('a seal is next once the new work is resting too', () => {
    const plan = planPractice([chunk(0, 6, [1]), chunk(1, 6, [0])]);
    expect(plan.next).toEqual({ kind: 'seal', chunkId: 'c0', tier: 6 });
  });

  it('passes over a chunk resting until tomorrow for the next one with work', () => {
    const plan = planPractice([chunk(0, 6, [0]), chunk(1, -1)]);
    expect(plan.next).toEqual({ kind: 'start', chunkId: 'c1', tier: 0 });
    expect(plan.optionalSeal).toBeNull();
  });

  it('falls back to the lowest resting chunk when nothing is left today', () => {
    const plan = planPractice([
      chunk(0, 6, [1, 2], 'memorized'),
      chunk(1, 6, [0]),
      chunk(2, 6, [0]),
    ]);
    expect(plan.next).toEqual({ kind: 'rest', chunkId: 'c1' });
  });

  it('offers the lowest-order fresh seal when several wait', () => {
    const plan = planPractice([chunk(0, 6, [1]), chunk(1, 6, [1]), chunk(2, 1)]);
    expect(plan.next?.chunkId).toBe('c2');
    expect(plan.optionalSeal?.chunkId).toBe('c0');
  });
});

describe('describeStep', () => {
  it('names the action and the reference on the button', () => {
    expect(describeStep({ kind: 'start', chunkId: 'c', tier: 0 }, 'John 3:17')).toMatchObject({
      verb: 'Start',
      button: 'Start John 3:17',
      subline: 'New verse · begins with Read',
    });
    expect(describeStep({ kind: 'continue', chunkId: 'c', tier: 4 }, 'John 3:16')).toMatchObject({
      verb: 'Continue',
      button: 'Continue John 3:16',
      subline: 'Next step · Arrange',
      spoken: 'Continue John 3:16. The next step is Arrange.',
    });
  });

  it('labels a seal as a seal, and says what follows it', () => {
    const seal = { kind: 'seal', chunkId: 'c', tier: 6 } as const;
    expect(describeStep(seal, 'John 3:16')).toMatchObject({
      button: 'Seal John 3:16',
      subline: 'One recitation makes it memorized',
    });
    expect(describeStep(seal, 'John 3:16', 'John 3:17').subline).toBe(
      'One recitation · then on to John 3:17',
    );
  });

  it('describes a resting verse as a status, not an action', () => {
    const copy = describeStep({ kind: 'rest', chunkId: 'c' }, 'John 3:16');
    expect(copy.button).toBe('John 3:16 seals tomorrow');
    expect(copy.spoken).toContain('done for today');
  });
});
