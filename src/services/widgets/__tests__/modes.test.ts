import { describe, expect, it } from 'vitest';

import { autoModeForTier, buildTextVariants, emptyTextVariants } from '@/services/widgets/modes';

/** Blanks are runs of underscores; the display strings are never re-tokenized. */
const blankCount = (text: string) => text.match(/_+/g)?.length ?? 0;

const phil46 =
  'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.';

describe('autoModeForTier', () => {
  it('follows the tier-based dissolution of docs/05 §1', () => {
    expect(autoModeForTier(0)).toBe('full');
    expect(autoModeForTier(2)).toBe('full');
    expect(autoModeForTier(3)).toBe('blanks50');
    expect(autoModeForTier(4)).toBe('blanks50');
    expect(autoModeForTier(5)).toBe('firstLetters');
    expect(autoModeForTier(6)).toBe('reference');
  });
});

describe('buildTextVariants', () => {
  it('renders every mode the Edit Widget sheet offers', () => {
    const v = buildTextVariants(phil46, 'chunk-1');
    expect(v.textFull).toBe(phil46);
    expect(v.textFirstLetters.startsWith('D n b a a a,')).toBe(true);
    for (const text of [v.textBlanks25, v.textBlanks50, v.textBlanks75]) {
      expect(blankCount(text)).toBeGreaterThan(0);
      // Blanking replaces words in place — spacing and word count are intact.
      expect(text.split(' ')).toHaveLength(phil46.split(' ').length);
    }
  });

  it('blanks more words as the density rises', () => {
    const v = buildTextVariants(phil46, 'chunk-1');
    expect(blankCount(v.textBlanks25)).toBeLessThan(blankCount(v.textBlanks50));
    expect(blankCount(v.textBlanks50)).toBeLessThan(blankCount(v.textBlanks75));
  });

  it('is stable for a chunk so the widget does not reshuffle on republish', () => {
    expect(buildTextVariants(phil46, 'chunk-1')).toEqual(buildTextVariants(phil46, 'chunk-1'));
    expect(buildTextVariants(phil46, 'chunk-2').textBlanks50).not.toBe(
      buildTextVariants(phil46, 'chunk-1').textBlanks50
    );
  });

  it('degrades to empty variants when no text may be shipped', () => {
    expect(buildTextVariants('', 'chunk-1')).toEqual(emptyTextVariants());
  });
});
