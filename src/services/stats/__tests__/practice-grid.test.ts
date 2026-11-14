import { describe, expect, it } from 'vitest';

import { practiceWeeks, weekdayColumn, type PracticeDay } from '@/services/stats/practice-grid';

/** `count` consecutive days ending on `end` (YYYY-MM-DD), oldest first. */
function daysEnding(end: string, count: number): PracticeDay[] {
  const [y, m, d] = end.split('-').map(Number);
  const out: PracticeDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(y, m - 1, d - i, 12);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    out.push({ date: iso, practiced: i % 2 === 0 });
  }
  return out;
}

describe('weekdayColumn', () => {
  it('puts Monday first and Sunday last', () => {
    expect(weekdayColumn('2026-11-09')).toBe(0); // Monday
    expect(weekdayColumn('2026-11-13')).toBe(4); // Friday
    expect(weekdayColumn('2026-11-15')).toBe(6); // Sunday
  });
});

describe('practiceWeeks', () => {
  it('is empty with no days', () => {
    expect(practiceWeeks([])).toEqual([]);
  });

  it('gives five full rows when the run ends on a Sunday', () => {
    const weeks = practiceWeeks(daysEnding('2026-11-15', 35));
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7 && w.every((c) => c !== null))).toBe(true);
    expect(weeks[0][0]?.date).toBe('2026-10-12');
  });

  it('pads the first and last rows so each day sits under its weekday', () => {
    // 35 days ending Friday 13 Nov 2026 start on Saturday 10 Oct.
    const weeks = practiceWeeks(daysEnding('2026-11-13', 35));
    expect(weeks).toHaveLength(6);
    expect(weeks[0].map((c) => c?.date ?? null)).toEqual([null, null, null, null, null, '2026-10-10', '2026-10-11']);
    expect(weeks[5].map((c) => c?.date ?? null)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      null,
      null,
    ]);
    for (const week of weeks) {
      week.forEach((cell, column) => {
        if (cell) expect(weekdayColumn(cell.date)).toBe(column);
      });
    }
  });

  it('keeps every day once and marks only the last as today', () => {
    const days = daysEnding('2026-11-13', 35);
    const cells = practiceWeeks(days).flat().filter((c) => c !== null);
    expect(cells.map((c) => c.date)).toEqual(days.map((d) => d.date));
    expect(cells.filter((c) => c.today).map((c) => c.date)).toEqual(['2026-11-13']);
    expect(cells.filter((c) => c.practiced)).toHaveLength(days.filter((d) => d.practiced).length);
  });

  it('lays a single week out for the widget-sized run', () => {
    const weeks = practiceWeeks(daysEnding('2026-11-11', 3));
    expect(weeks).toHaveLength(1);
    expect(weeks[0].map((c) => c !== null)).toEqual([true, true, true, false, false, false, false]);
  });
});
