import { describe, expect, it } from 'vitest';

import { clampTextSize, readerType, stepTextSize } from '@/features/reader/text-size';

// docs/07 §4: 22/34 in the reader, user-adjustable 18–28.
const scale = { defaultSize: 22, defaultLineHeight: 34, minSize: 18, maxSize: 28 };

describe('clampTextSize', () => {
  it('keeps a size on the scale', () => {
    expect(clampTextSize(18, scale)).toBe(18);
    expect(clampTextSize(24, scale)).toBe(24);
    expect(clampTextSize(28, scale)).toBe(28);
  });

  it('brings a stored size from outside the scale back onto it', () => {
    expect(clampTextSize(4, scale)).toBe(18);
    expect(clampTextSize(90, scale)).toBe(28);
    expect(clampTextSize(21.6, scale)).toBe(22);
  });

  it('falls back to the default for a value that is not a number', () => {
    expect(clampTextSize(Number('large'), scale)).toBe(22);
    expect(clampTextSize(Infinity, scale)).toBe(22);
  });
});

describe('stepTextSize', () => {
  it('walks the whole scale in even steps', () => {
    const sizes = [18];
    while (stepTextSize(sizes[sizes.length - 1], 1, scale) !== sizes[sizes.length - 1]) {
      sizes.push(stepTextSize(sizes[sizes.length - 1], 1, scale));
    }
    expect(sizes).toEqual([18, 20, 22, 24, 26, 28]);
  });

  it('stops at both ends', () => {
    expect(stepTextSize(18, -1, scale)).toBe(18);
    expect(stepTextSize(28, 1, scale)).toBe(28);
  });
});

describe('readerType', () => {
  it('is 22/34 at the default size', () => {
    expect(readerType(22, scale)).toEqual({ fontSize: 22, lineHeight: 34 });
  });

  it('keeps the proportion at the ends of the scale', () => {
    expect(readerType(18, scale)).toEqual({ fontSize: 18, lineHeight: 28 });
    expect(readerType(28, scale)).toEqual({ fontSize: 28, lineHeight: 43 });
  });
});
