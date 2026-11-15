import { describe, expect, it } from 'vitest';

import { gradeTyped } from '@/services/grading';
import {
  arrangedOrder,
  buildArrangeRound,
  describeFeedback,
  displayTokensForGraded,
  gradeArrangement,
  placeTile,
  removeTile,
  type FeedbackFacts,
} from '@/services/practice';

const facts = (over: Partial<FeedbackFacts> = {}): FeedbackFacts => ({
  graded: true,
  accuracy: 1,
  passed: true,
  band: 'pass',
  slips: null,
  marked: false,
  tierCleared: false,
  memorized: false,
  sealsTomorrow: false,
  needsCleanPass: false,
  restPoint: false,
  suggestDropTier: false,
  ...over,
});

describe('describeFeedback', () => {
  it('a pass inside a tier moves on to the next round', () => {
    const copy = describeFeedback(facts(), 1);
    expect(copy.heading).toBe('Round passed');
    expect(copy.primary).toEqual({ label: 'Continue', action: 'next' });
    expect(copy.secondary).toEqual([]);
  });

  it('a cleared tier names the tier', () => {
    const copy = describeFeedback(facts({ graded: false, tierCleared: true }), 0);
    expect(copy.heading).toBe('Read cleared');
    expect(copy.primary).toEqual({ label: 'Continue', action: 'next' });
  });

  it('says when a pass leaned on the error budget', () => {
    expect(describeFeedback(facts({ accuracy: 0.9, slips: 1, marked: true }), 5).heading).toBe(
      'Passed, one slip forgiven',
    );
    expect(describeFeedback(facts({ accuracy: 0.9, tierCleared: true }), 4).heading).toBe(
      'Arrange cleared, a slip forgiven',
    );
  });

  it('an ungraded round never reports a forgiven slip', () => {
    // A self-report has no score, whatever number rides along with it.
    const copy = describeFeedback(facts({ graded: false, accuracy: 0 }), 1);
    expect(copy.heading).toBe('Round passed');
  });

  it('a miss is tried again, with the words marked when there are any', () => {
    const miss = facts({ passed: false, band: 'miss', accuracy: 0.4 });
    expect(describeFeedback(miss, 2).heading).toBe('Not quite — try this round again');
    expect(describeFeedback({ ...miss, marked: true }, 5).heading).toBe(
      'Not quite — the slipped words are marked below',
    );
    expect(describeFeedback(miss, 2).primary).toEqual({ label: 'Try again', action: 'next' });
  });

  it('an honest "Not yet" is a retry, not a score', () => {
    const copy = describeFeedback(
      facts({ graded: false, passed: false, band: 'miss', accuracy: 0 }),
      1,
    );
    expect(copy.heading).toBe('Not quite — try this round again');
    expect(copy.primary.label).toBe('Try again');
  });

  it('offers a lower tier after repeated misses', () => {
    const copy = describeFeedback(
      facts({ passed: false, band: 'miss', accuracy: 0.3, suggestDropTier: true }),
      4,
    );
    expect(copy.secondary).toEqual([
      {
        label: 'Rebuild at Blanks 50/75',
        hint: 'Rebuilds this chunk one tier lower; your progress is kept',
        action: 'dropTier',
      },
    ]);
  });

  it('an almost moves on and says what it was', () => {
    const almost = facts({ band: 'almost', accuracy: 0.9 });
    expect(describeFeedback(almost, 4).heading).toBe('Almost — close enough to move on');
    expect(describeFeedback({ ...almost, marked: true }, 5).heading).toBe(
      'Almost — the slipped words are marked below',
    );
    expect(describeFeedback(almost, 4).primary).toEqual({ label: 'Continue', action: 'next' });
  });

  it('the rest point stops for the day, with keep going beside it', () => {
    const copy = describeFeedback(facts({ tierCleared: true, restPoint: true }), 3);
    expect(copy.primary).toEqual({ label: 'Done for today', action: 'finish' });
    expect(copy.secondary.map((b) => [b.label, b.action])).toEqual([['Keep going', 'next']]);
  });

  it('a top tier that seals tomorrow ends the session', () => {
    const copy = describeFeedback(facts({ tierCleared: true, sealsTomorrow: true }), 6);
    expect(copy.primary).toEqual({ label: 'Done for today', action: 'finish' });
    expect(copy.secondary).toEqual([]);
  });

  it('an almost at the top with nothing banked offers the clean pass or a stop', () => {
    const copy = describeFeedback(
      facts({ band: 'almost', accuracy: 0.9, tierCleared: true, needsCleanPass: true }),
      6,
    );
    expect(copy.heading).toBe('Almost — not a clean pass yet');
    expect(copy.primary).toEqual({ label: 'Try again', action: 'next' });
    expect(copy.secondary.map((b) => [b.label, b.action])).toEqual([
      ['Stop for today', 'finish'],
    ]);
  });

  it('a memorized verse goes to the summary, not into the next verse', () => {
    const copy = describeFeedback(facts({ tierCleared: true, memorized: true }), 6);
    expect(copy.heading).toBe('Memorized');
    expect(copy.primary).toEqual({ label: 'Continue', action: 'finish' });
    expect(copy.secondary).toEqual([]);
  });
});

describe('displayTokensForGraded', () => {
  const shown = (text: string, input: string, language?: string) => {
    const result = gradeTyped(text, input, { language });
    return displayTokensForGraded(text, result.words, { language }).map((token, i) =>
      token ? `${token.prefix}${token.word}${token.suffix}` : `<${result.words[i].word}>`,
    );
  };

  it('gives each graded word its casing and punctuation back', () => {
    const verse = 'Rejoice in the Lord always! Again I will say, “Rejoice!”';
    expect(shown(verse, 'rejoice in the lord always again i will say rejoice')).toEqual([
      'Rejoice',
      'in',
      'the',
      'Lord',
      'always!',
      'Again',
      'I',
      'will',
      'say,',
      '“Rejoice!”',
    ]);
  });

  it('follows the graded words, including missed and wrong ones', () => {
    const verse = 'Jesus wept.';
    const result = gradeTyped(verse, 'jesus');
    expect(result.words.map((w) => w.tag)).toEqual(['correct', 'missed']);
    expect(displayTokensForGraded(verse, result.words).map((d) => d?.word)).toEqual([
      'Jesus',
      'wept',
    ]);
  });

  it('keeps accents the grader strips', () => {
    expect(shown('Él vino por testimonio.', 'el vino por testimonio', 'es')).toEqual([
      'Él',
      'vino',
      'por',
      'testimonio.',
    ]);
  });

  it('falls back on a hyphenated word and stays aligned after it', () => {
    // Grading sees "long" and "suffering"; the display token is one word.
    expect(shown('Love is long-suffering, and kind.', 'love is long suffering and kind')).toEqual([
      'Love',
      'is',
      '<long>',
      '<suffering>',
      'and',
      'kind.',
    ]);
  });

  it('never prints a neighbour where number words were folded into digits', () => {
    const verse = 'He fasted forty two days, then ate.';
    const result = gradeTyped(verse, verse, { language: 'en' });
    const display = displayTokensForGraded(verse, result.words, { language: 'en' });
    result.words.forEach((w, i) => {
      const token = display[i];
      if (token) expect(token.word.toLowerCase()).toBe(w.word);
    });
    expect(display[0]?.word).toBe('He');
  });

  it('is empty for a result with no words (Blanks, Arrange)', () => {
    expect(displayTokensForGraded('Jesus wept.', [])).toEqual([]);
  });
});

describe('arrange slots', () => {
  const round = buildArrangeRound(
    'Paul and Timothy, servants of Jesus Christ; To all the saints in Christ Jesus who are at Philippi, with the overseers and servants:',
    'chunk',
    0,
  );
  const n = round.phrases.length;
  const inOrder = () => {
    let slots: (number | null)[] = [];
    for (let tile = 0; tile < n; tile++) ({ slots } = placeTile(slots, tile));
    return slots;
  };

  it('appends while no slot is open', () => {
    const first = placeTile([], 3);
    expect(first).toEqual({ slots: [3], position: 0 });
    expect(placeTile(first.slots, 1)).toEqual({ slots: [3, 1], position: 1 });
  });

  it('removing a tile leaves its slot open, and the next tile fills it', () => {
    const open = removeTile([0, 2, 1, 3], 1);
    expect(open).toEqual([0, null, 1, 3]);
    expect(placeTile(open, 4)).toEqual({ slots: [0, 4, 1, 3], position: 1 });
  });

  it('fills the earliest open slot first', () => {
    const open = removeTile(removeTile([0, 1, 2, 3], 2), 0);
    expect(open).toEqual([null, 1, null, 3]);
    expect(placeTile(open, 2).position).toBe(0);
  });

  it('drops open slots at the end', () => {
    expect(removeTile([0, 1, 2], 2)).toEqual([0, 1]);
    expect(removeTile([0, null, 2], 2)).toEqual([0]);
    expect(removeTile([0], 0)).toEqual([]);
  });

  it('has an order to grade only when every tile is placed', () => {
    const slots = inOrder();
    expect(arrangedOrder(round, slots)).toEqual(slots);
    expect(arrangedOrder(round, removeTile(slots, 1))).toBeNull();
    expect(arrangedOrder(round, slots.slice(0, n - 1))).toBeNull();
    expect(arrangedOrder(round, [])).toBeNull();
  });

  it('fixing one tile in place grades the same as placing it right the first time', () => {
    // Tiles 1 and 2 tapped in the wrong order, then both put back.
    let slots = inOrder();
    [slots[1], slots[2]] = [slots[2], slots[1]];
    slots = removeTile(removeTile(slots, 1), 2);
    ({ slots } = placeTile(slots, 1));
    ({ slots } = placeTile(slots, 2));
    const order = arrangedOrder(round, slots);
    expect(order).not.toBeNull();
    expect(gradeArrangement(round, order!)).toBe(1);
  });
});
