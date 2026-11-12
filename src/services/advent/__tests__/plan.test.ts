import { describe, expect, it } from 'vitest';

import {
  adventFor,
  adventNoticeDays,
  adventPlan,
  adventWeek,
  firstSundayOfAdvent,
} from '@/services/advent';
import { formatRange } from '@/services/bible/refs';

describe('firstSundayOfAdvent', () => {
  it('is the fourth Sunday before Christmas Day', () => {
    expect(firstSundayOfAdvent(2026)).toBe('2026-11-29'); // Christmas on a Friday
    expect(firstSundayOfAdvent(2027)).toBe('2027-11-28'); // Saturday
    expect(firstSundayOfAdvent(2028)).toBe('2028-12-03'); // Monday: the latest it falls
    expect(firstSundayOfAdvent(2022)).toBe('2022-11-27'); // Sunday: the earliest
    expect(firstSundayOfAdvent(2023)).toBe('2023-12-03'); // Monday
  });
});

describe('adventPlan', () => {
  const plan = adventPlan(2026)!;

  it('lays out 2026', () => {
    expect(plan.opens).toBe('2026-11-22');
    expect(plan.sundays).toEqual(['2026-11-29', '2026-12-06', '2026-12-13', '2026-12-20']);
    expect(plan.ends).toBe('2026-12-25');
    expect(plan.main.code).toBe('ADVENT26');
    expect(plan.short.code).toBe('ADVENT26S');
  });

  it('covers the main passage with the four weeks, in order and without gaps', () => {
    expect(plan.main.range.start).toEqual(plan.weeks[0].start);
    expect(plan.main.range.end).toEqual(plan.weeks[3].end);
    for (let i = 1; i < plan.weeks.length; i++) {
      expect(plan.weeks[i].start.verse).toBe(plan.weeks[i - 1].end.verse + 1);
    }
  });

  it('keeps the short track inside the main one', () => {
    expect(plan.short.range.start.verse).toBeGreaterThanOrEqual(plan.main.range.start.verse);
    expect(plan.short.range.end.verse).toBeLessThanOrEqual(plan.main.range.end.verse);
  });

  it('is Luke 2:1–14 with 2:8–14 as the short track', () => {
    expect(plan.main.range.start).toEqual({ bookId: 'Luke', chapter: 2, verse: 1 });
    expect(plan.main.range.end).toEqual({ bookId: 'Luke', chapter: 2, verse: 14 });
    expect(plan.short.range.start.verse).toBe(8);
    expect(formatRange(plan.weeks[1])).toContain('2:5');
  });

  it('has no plan for a year without a passage', () => {
    expect(adventPlan(2025)).toBeNull();
    expect(adventPlan(2027)).toBeNull();
  });
});

describe('adventFor', () => {
  it('is offered from the Sunday before Advent through Christmas Day', () => {
    expect(adventFor('2026-11-21')).toBeNull();
    expect(adventFor('2026-11-22')?.year).toBe(2026);
    expect(adventFor('2026-12-25')?.year).toBe(2026);
    expect(adventFor('2026-12-26')).toBeNull();
    expect(adventFor('2027-01-01')).toBeNull();
    expect(adventFor('')).toBeNull();
  });
});

describe('adventWeek', () => {
  const plan = adventPlan(2026)!;

  it('counts the Sundays reached', () => {
    expect(adventWeek(plan, '2026-11-22')).toBe(0);
    expect(adventWeek(plan, '2026-11-28')).toBe(0);
    expect(adventWeek(plan, '2026-11-29')).toBe(1);
    expect(adventWeek(plan, '2026-12-05')).toBe(1);
    expect(adventWeek(plan, '2026-12-06')).toBe(2);
    expect(adventWeek(plan, '2026-12-13')).toBe(3);
    expect(adventWeek(plan, '2026-12-20')).toBe(4);
    expect(adventWeek(plan, '2026-12-25')).toBe(4);
  });
});

describe('adventNoticeDays', () => {
  const plan = adventPlan(2026)!;

  it('sends a line each Sunday to someone on the plan', () => {
    expect(adventNoticeDays(plan, { joined: true, dismissed: false })).toEqual([
      { date: '2026-11-29', week: 1 },
      { date: '2026-12-06', week: 2 },
      { date: '2026-12-13', week: 3 },
      { date: '2026-12-20', week: 4 },
    ]);
  });

  it('invites once, on the first Sunday, someone who has not started', () => {
    expect(adventNoticeDays(plan, { joined: false, dismissed: false })).toEqual([
      { date: '2026-11-29', week: 0 },
    ]);
  });

  it('says nothing after the card is dismissed', () => {
    expect(adventNoticeDays(plan, { joined: false, dismissed: true })).toEqual([]);
  });

  it('still follows the plan when it was joined and the card dismissed', () => {
    expect(adventNoticeDays(plan, { joined: true, dismissed: true })).toHaveLength(4);
  });
});
