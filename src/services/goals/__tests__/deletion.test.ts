import { describe, expect, it } from 'vitest';

import {
  chunksToDropOnStop,
  deleteGoalPrompt,
  goalRemoval,
  mayDeleteGoal,
  mayStopGoal,
  stopGoalPrompt,
} from '@/services/goals/deletion';

const chunk = (status: string) => ({ status });

describe('mayDeleteGoal', () => {
  it('allows a passage in progress with nothing memorized', () => {
    expect(
      mayDeleteGoal({ status: 'active' }, [chunk('learning'), chunk('active'), chunk('locked')]),
    ).toBe(true);
  });

  it('allows a passage not started yet', () => {
    expect(mayDeleteGoal({ status: 'active' }, [chunk('active'), chunk('locked')])).toBe(true);
    expect(mayDeleteGoal({ status: 'active' }, [])).toBe(true);
  });

  it('refuses once any chunk is memorized', () => {
    expect(mayDeleteGoal({ status: 'active' }, [chunk('memorized'), chunk('learning')])).toBe(
      false,
    );
  });

  it('refuses a completed passage', () => {
    expect(mayDeleteGoal({ status: 'completed' }, [chunk('memorized')])).toBe(false);
  });

  it('refuses an archived passage', () => {
    expect(mayDeleteGoal({ status: 'archived' }, [chunk('learning')])).toBe(false);
  });
});

describe('mayStopGoal', () => {
  it('allows a passage in progress that is partly memorized', () => {
    expect(mayStopGoal({ status: 'active' }, [chunk('memorized'), chunk('learning')])).toBe(true);
    expect(
      mayStopGoal({ status: 'active' }, [chunk('learning'), chunk('memorized'), chunk('locked')]),
    ).toBe(true);
  });

  it('refuses a passage with nothing memorized — that one is deleted instead', () => {
    expect(mayStopGoal({ status: 'active' }, [chunk('learning'), chunk('locked')])).toBe(false);
    expect(mayStopGoal({ status: 'active' }, [])).toBe(false);
  });

  it('refuses a passage with every chunk memorized: only its final stitch is left', () => {
    expect(mayStopGoal({ status: 'active' }, [chunk('memorized'), chunk('memorized')])).toBe(false);
  });

  it('refuses a passage that is not in progress', () => {
    const chunks = [chunk('memorized'), chunk('learning')];
    expect(mayStopGoal({ status: 'completed' }, chunks)).toBe(false);
    expect(mayStopGoal({ status: 'archived' }, chunks)).toBe(false);
    expect(mayStopGoal({ status: 'stopped' }, chunks)).toBe(false);
  });
});

describe('goalRemoval', () => {
  it('deletes before anything is memorized, stops partway, and offers nothing after', () => {
    const active = { status: 'active' };
    expect(goalRemoval(active, [chunk('learning'), chunk('locked')])).toBe('delete');
    expect(goalRemoval(active, [chunk('memorized'), chunk('locked')])).toBe('stop');
    expect(goalRemoval(active, [chunk('memorized')])).toBeNull();
    expect(goalRemoval({ status: 'completed' }, [chunk('memorized')])).toBeNull();
    expect(goalRemoval({ status: 'stopped' }, [chunk('memorized')])).toBeNull();
  });

  it('never offers both: a goal is either deletable or stoppable', () => {
    const statuses = ['locked', 'active', 'learning', 'memorized'];
    for (const a of statuses) {
      for (const b of statuses) {
        const chunks = [chunk(a), chunk(b)];
        const both =
          mayDeleteGoal({ status: 'active' }, chunks) && mayStopGoal({ status: 'active' }, chunks);
        expect(both).toBe(false);
      }
    }
  });
});

describe('chunksToDropOnStop', () => {
  it('drops every chunk not yet memorized and keeps the memorized ones', () => {
    const chunks = [
      { id: 'a', status: 'memorized' },
      { id: 'b', status: 'learning' },
      { id: 'c', status: 'memorized' },
      { id: 'd', status: 'active' },
      { id: 'e', status: 'locked' },
    ];
    expect(chunksToDropOnStop(chunks).map((c) => c.id)).toEqual(['b', 'd', 'e']);
  });
});

describe('stopGoalPrompt', () => {
  it('names the passage in the title', () => {
    expect(stopGoalPrompt('Romans 8').title).toBe('Stop Romans 8?');
  });

  it('says the memorized verses stay, and what goes', () => {
    expect(stopGoalPrompt('Romans 8').message).toBe(
      'The verses you’ve memorized stay on your Memorized shelf and in your reviews. Your practice on the rest of this passage is deleted. You can’t undo this.',
    );
  });

  it('labels the destructive button with a verb, in sentence case', () => {
    expect(stopGoalPrompt('Romans 8').confirm).toBe('Stop passage');
  });
});

describe('deleteGoalPrompt', () => {
  it('names the passage in the title', () => {
    expect(deleteGoalPrompt('Psalm 23').title).toBe('Delete Psalm 23?');
  });

  it('says what is lost and what stays', () => {
    expect(deleteGoalPrompt('Psalm 23').message).toBe(
      'This deletes your practice history for this passage. Your streak and badges stay. You can’t undo this.',
    );
  });

  it('labels the destructive button with a verb, in sentence case', () => {
    expect(deleteGoalPrompt('John 3:16').confirm).toBe('Delete passage');
  });
});
