import { describe, expect, it } from 'vitest';

import { deleteGoalPrompt, mayDeleteGoal } from '@/services/goals/deletion';

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
