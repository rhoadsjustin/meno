import { describe, expect, it } from 'vitest';

import { sortByRisk } from '@/services/goals/memorized-order';
import { healthOf } from '@/services/scheduler';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

describe('sortByRisk', () => {
  const due: Record<string, number | undefined> = {
    fresh: NOW + 5 * DAY,
    fading: NOW - DAY,
    atRisk: NOW - 10 * DAY,
    veryAtRisk: NOW - 30 * DAY,
    freshSooner: NOW + DAY,
    unscheduled: undefined,
  };
  const sorted = (ids: string[]) => sortByRisk(ids, (id) => due[id]);

  it('puts at risk before fading before fresh', () => {
    const order = sorted(['fresh', 'fading', 'atRisk']);
    expect(order).toEqual(['atRisk', 'fading', 'fresh']);
    expect(order.map((id) => healthOf({ dueAt: due[id]! }, NOW))).toEqual([
      'atRisk',
      'fading',
      'fresh',
    ]);
  });

  it('orders within a health by the earliest due date', () => {
    expect(sorted(['fresh', 'atRisk', 'freshSooner', 'veryAtRisk'])).toEqual([
      'veryAtRisk',
      'atRisk',
      'freshSooner',
      'fresh',
    ]);
  });

  it('puts a chunk with no review schedule last', () => {
    expect(sorted(['unscheduled', 'fresh', 'fading'])).toEqual(['fading', 'fresh', 'unscheduled']);
  });

  it('keeps the given order on ties and does not mutate its input', () => {
    const rows = [
      { id: 'a', due: NOW },
      { id: 'b', due: NOW - DAY },
      { id: 'c', due: NOW },
    ];
    const copy = [...rows];
    expect(sortByRisk(rows, (r) => r.due).map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(rows).toEqual(copy);
  });
});
