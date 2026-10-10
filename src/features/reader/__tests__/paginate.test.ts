import { describe, expect, it } from 'vitest';

import { buildFlow, pageRuns, paginate, spreadCount, spreadFor } from '@/features/reader/paginate';
import type { Verse } from '@/services/bible';

const verse = (n: number, text: string): Verse => ({
  translationId: 'web',
  bookId: 'John',
  chapter: 1,
  verse: n,
  text,
});

const verses = [
  verse(1, 'In the beginning was the Word,'),
  verse(2, 'The same was in the beginning with God.'),
];

/** Breaks the flow into lines of at most `width` characters, on spaces. */
function wrap(text: string, width: number, trailingSpace: boolean) {
  const lines: { text: string; height: number }[] = [];
  let line = '';
  for (const word of text.trim().split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push({ text: trailingSpace ? `${line} ` : line, height: 10 });
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push({ text: line, height: 10 });
  return lines;
}

describe('buildFlow', () => {
  it('lays verses end to end with their numbers', () => {
    const flow = buildFlow(verses);
    expect(flow.text).toBe(
      '1 In the beginning was the Word, 2 The same was in the beginning with God. ',
    );
    expect(flow.segments.map((s) => flow.text.slice(s.start, s.end))).toEqual([
      '1 ',
      'In the beginning was the Word, ',
      '2 ',
      'The same was in the beginning with God. ',
    ]);
  });
});

describe('paginate', () => {
  const flow = buildFlow(verses);

  it.each([true, false])('covers the flow with no gaps (trailing space: %s)', (trailing) => {
    const pages = paginate(flow.text, wrap(flow.text, 16, trailing), 20);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(flow.text.length);
    for (let i = 1; i < pages.length; i++) expect(pages[i].start).toBe(pages[i - 1].end);
    expect(pages.map((p) => flow.text.slice(p.start, p.end)).join('')).toBe(flow.text);
  });

  it('fits as many lines as the page height allows', () => {
    const lines = wrap(flow.text, 16, true);
    expect(paginate(flow.text, lines, 20)).toHaveLength(Math.ceil(lines.length / 2));
    expect(paginate(flow.text, lines, 1000)).toHaveLength(1);
  });

  it('gives a page at least one line, however short the page', () => {
    const lines = wrap(flow.text, 16, true);
    expect(paginate(flow.text, lines, 1)).toHaveLength(lines.length);
  });

  it('starts pages on line starts, also when a line repeats earlier words', () => {
    const repeated = buildFlow([verse(1, 'the the the the the the the the')]);
    const pages = paginate(repeated.text, wrap(repeated.text, 8, false), 10);
    expect(pages.map((p) => repeated.text.slice(p.start, p.end))).toEqual([
      '1 the ',
      'the the ',
      'the the ',
      'the the ',
      'the ',
    ]);
  });

  it('returns no pages for an empty chapter', () => {
    expect(paginate('', [], 100)).toEqual([]);
  });
});

describe('pageRuns', () => {
  it('splits a verse across a page boundary and keeps number styling', () => {
    const flow = buildFlow(verses);
    const cut = flow.text.indexOf('was the Word');
    expect(pageRuns(flow, { start: 0, end: cut })).toEqual([
      { key: '1:num', kind: 'num', text: '1 ' },
      { key: '1:text', kind: 'text', text: 'In the beginning ' },
    ]);
    expect(pageRuns(flow, { start: cut, end: flow.text.length }).map((r) => r.text)).toEqual([
      'was the Word, ',
      '2 ',
      'The same was in the beginning with God. ',
    ]);
  });
});

describe('spreads', () => {
  const pages = [
    { start: 0, end: 10 },
    { start: 10, end: 20 },
    { start: 20, end: 30 },
  ];

  it('pairs pages', () => {
    expect(spreadCount(pages)).toBe(2);
    expect(spreadCount([])).toBe(0);
  });

  it('finds the spread holding an anchor, clamping past the end', () => {
    expect(spreadFor(pages, 0)).toBe(0);
    expect(spreadFor(pages, 19)).toBe(0);
    expect(spreadFor(pages, 20)).toBe(1);
    expect(spreadFor(pages, Infinity)).toBe(1);
    expect(spreadFor([], 5)).toBe(0);
  });
});
