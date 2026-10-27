import { describe, expect, it } from 'vitest';

import { keepPracticeDays, parsePracticeDays } from '@/services/stats/practice-days';

describe('parsePracticeDays', () => {
  it('reads a stored list', () => {
    expect(parsePracticeDays('["2026-10-01","2026-10-03"]')).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('reads nothing stored as no days', () => {
    expect(parsePracticeDays(undefined)).toEqual([]);
    expect(parsePracticeDays(null)).toEqual([]);
    expect(parsePracticeDays('')).toEqual([]);
  });

  it('drops malformed input instead of throwing', () => {
    expect(parsePracticeDays('not json')).toEqual([]);
    expect(parsePracticeDays('{"a":1}')).toEqual([]);
    expect(parsePracticeDays('["2026-10-01", 3, "yesterday", null]')).toEqual(['2026-10-01']);
  });
});

describe('keepPracticeDays', () => {
  it('adds new days once each, oldest first', () => {
    expect(
      keepPracticeDays(['2026-10-20'], ['2026-10-22', '2026-10-20', '2026-10-19'], '2026-10-26'),
    ).toEqual(['2026-10-19', '2026-10-20', '2026-10-22']);
  });

  it('keeps days already kept when a later goal is deleted', () => {
    const first = keepPracticeDays([], ['2026-10-01'], '2026-10-26');
    expect(keepPracticeDays(first, ['2026-10-25'], '2026-10-26')).toEqual([
      '2026-10-01',
      '2026-10-25',
    ]);
  });

  it('drops days older than the window, counting today as day one', () => {
    expect(
      keepPracticeDays([], ['2026-10-19', '2026-10-20', '2026-10-26'], '2026-10-26', 7),
    ).toEqual(['2026-10-20', '2026-10-26']);
  });

  it('counts the window across month and year ends', () => {
    expect(keepPracticeDays([], ['2025-12-31', '2026-01-01'], '2026-01-01', 2)).toEqual([
      '2025-12-31',
      '2026-01-01',
    ]);
    expect(keepPracticeDays([], ['2025-12-30'], '2026-01-01', 2)).toEqual([]);
  });

  it('keeps a year of days by default', () => {
    expect(keepPracticeDays([], ['2025-10-27'], '2026-10-26')).toEqual(['2025-10-27']);
  });

  it('ignores anything that is not a date', () => {
    expect(keepPracticeDays(['bad'], ['2026-10-26', ''], '2026-10-26')).toEqual(['2026-10-26']);
  });
});
