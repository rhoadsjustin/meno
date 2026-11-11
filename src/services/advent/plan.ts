/**
 * The Advent plan (docs/11 §3): one passage memorized over the four weeks
 * of Advent, finished on Christmas Day. Offered from the Sunday before
 * Advent through December 25, local time.
 *
 * References only — text is read through services/bible like everything
 * else. Pure: no React Native or database imports. The passage for a year
 * is data; the dates are computed. The codes and ranges are also written
 * into site/advent/index.html; keep the two in step.
 */
import type { RefRange } from '@/services/bible/types';

export type AdventTrack = {
  /** Shared challenge code (goals.challengeId) for everyone on this track. */
  code: string;
  range: RefRange;
};

export type AdventPlan = {
  year: number;
  /** First day the plan is offered: the Sunday before Advent. */
  opens: string;
  /** The four Sundays of Advent, 'YYYY-MM-DD'. */
  sundays: readonly [string, string, string, string];
  /** Christmas Day: the target date, and the last day the plan is offered. */
  ends: string;
  /** The whole passage. */
  main: AdventTrack;
  /** A shorter part of the same passage. */
  short: AdventTrack;
  /** The main track's verses for each of the four weeks. */
  weeks: readonly [RefRange, RefRange, RefRange, RefRange];
};

type Passage = {
  bookId: string;
  chapter: number;
  /** [first, last] verse of each week, in order; together the main track. */
  weeks: readonly [[number, number], [number, number], [number, number], [number, number]];
  /** [first, last] verse of the short track. */
  short: [number, number];
};

/** Luke 2:1–14, with the angels and the shepherds (8–14) as the short track. */
const PASSAGES: Record<number, Passage> = {
  2026: {
    bookId: 'Luke',
    chapter: 2,
    weeks: [
      [1, 4],
      [5, 7],
      [8, 11],
      [12, 14],
    ],
    short: [8, 14],
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The first Sunday of Advent: the fourth Sunday before Christmas Day. */
export function firstSundayOfAdvent(year: number): string {
  const christmas = Date.UTC(year, 11, 25);
  // The Sunday on or before December 24, then three weeks back.
  const eve = christmas - DAY_MS;
  const fourth = eve - new Date(eve).getUTCDay() * DAY_MS;
  return iso(fourth - 21 * DAY_MS);
}

function range(p: Passage, [from, to]: readonly [number, number]): RefRange {
  return {
    start: { bookId: p.bookId, chapter: p.chapter, verse: from },
    end: { bookId: p.bookId, chapter: p.chapter, verse: to },
  };
}

/** The plan for a year, or null when no passage has been chosen for it. */
export function adventPlan(year: number): AdventPlan | null {
  const passage = PASSAGES[year];
  if (!passage) return null;
  const first = Date.parse(`${firstSundayOfAdvent(year)}T00:00:00Z`);
  const sunday = (n: number) => iso(first + n * 7 * DAY_MS);
  const code = `ADVENT${String(year).slice(2)}`;
  return {
    year,
    opens: sunday(-1),
    sundays: [sunday(0), sunday(1), sunday(2), sunday(3)],
    ends: `${year}-12-25`,
    main: { code, range: range(passage, [passage.weeks[0][0], passage.weeks[3][1]]) },
    short: { code: `${code}S`, range: range(passage, passage.short) },
    weeks: [
      range(passage, passage.weeks[0]),
      range(passage, passage.weeks[1]),
      range(passage, passage.weeks[2]),
      range(passage, passage.weeks[3]),
    ],
  };
}

/** The plan on offer on a local date ('YYYY-MM-DD'), or null out of season. */
export function adventFor(today: string): AdventPlan | null {
  const plan = adventPlan(Number(today.slice(0, 4)));
  if (!plan || today < plan.opens || today > plan.ends) return null;
  return plan;
}

/** Which week of Advent a date falls in: 0 before the first Sunday, then 1–4. */
export function adventWeek(plan: AdventPlan, today: string): 0 | 1 | 2 | 3 | 4 {
  let week = 0;
  for (const sunday of plan.sundays) if (today >= sunday) week++;
  return week as 0 | 1 | 2 | 3 | 4;
}

export type AdventNoticeDay = {
  /** Local date the notice goes out. */
  date: string;
  /** 1–4 for a weekly line to someone on the plan; 0 for the invitation. */
  week: 0 | 1 | 2 | 3 | 4;
};

/**
 * The days a notice goes out (docs/11 §3.2): each Advent Sunday for someone
 * who has started, and one invitation on the first Sunday for someone who
 * has neither started nor dismissed the card.
 */
export function adventNoticeDays(
  plan: AdventPlan,
  state: { joined: boolean; dismissed: boolean },
): AdventNoticeDay[] {
  if (state.joined) {
    return plan.sundays.map((date, i) => ({ date, week: (i + 1) as 1 | 2 | 3 | 4 }));
  }
  return state.dismissed ? [] : [{ date: plan.sundays[0], week: 0 }];
}
