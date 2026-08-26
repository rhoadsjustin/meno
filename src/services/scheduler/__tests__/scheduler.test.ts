import { describe, expect, it } from 'vitest';

import {
  applyReview,
  createReviewState,
  healthOf,
  MAX_INTERVAL_DAYS,
  orderReviewQueue,
  type ReviewState,
} from '@/services/scheduler';

const DAY = 24 * 60 * 60 * 1000;
const noFuzz = () => 0.5; // 0.9 + 0.2*0.5 = exactly 1.0
const t0 = 1_750_000_000_000;

function fresh(): ReviewState {
  return createReviewState(t0, noFuzz);
}

describe('scheduler (modified SM-2)', () => {
  it('starts at easiness 2.5, interval 1', () => {
    const s = fresh();
    expect(s.easiness).toBe(2.5);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(0);
    expect(s.dueAt).toBe(t0 + DAY);
  });

  it('grows intervals 1 → 3 → interval×easiness on passing reviews', () => {
    let s = fresh();
    s = applyReview(s, 1, t0, noFuzz); // q=5
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(1);
    s = applyReview(s, 1, s.dueAt, noFuzz);
    expect(s.intervalDays).toBe(3);
    s = applyReview(s, 1, s.dueAt, noFuzz);
    // easiness has grown 2.5 → 2.6 → 2.7 (clamped) by the third review
    expect(s.intervalDays).toBeCloseTo(3 * 2.7);
    expect(s.repetitions).toBe(3);
  });

  it('resets repetitions and interval on a failed review', () => {
    let s = fresh();
    s = applyReview(s, 1, t0, noFuzz);
    s = applyReview(s, 1, s.dueAt, noFuzz);
    expect(s.intervalDays).toBe(3);
    s = applyReview(s, 0.4, s.dueAt, noFuzz); // q=2 → fail
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.easiness).toBeLessThan(2.6);
  });

  it('clamps easiness to [1.3, 2.7]', () => {
    let s = fresh();
    for (let i = 0; i < 20; i++) s = applyReview(s, 0, s.dueAt, noFuzz);
    expect(s.easiness).toBe(1.3);
    for (let i = 0; i < 30; i++) s = applyReview(s, 1, s.dueAt, noFuzz);
    expect(s.easiness).toBe(2.7);
  });

  it('caps the interval at 180 days', () => {
    let s = fresh();
    for (let i = 0; i < 30; i++) s = applyReview(s, 1, s.dueAt, noFuzz);
    expect(s.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('fuzzes due dates within ±10%', () => {
    const early = applyReview(fresh(), 1, t0, () => 0); // 0.9×
    const late = applyReview(fresh(), 1, t0, () => 0.999); // ≈1.1×
    expect(early.dueAt).toBe(t0 + 0.9 * DAY);
    expect(late.dueAt).toBeGreaterThan(t0 + 1.09 * DAY);
  });

  it('intervals visibly grow across simulated days (M3 acceptance shape)', () => {
    let s = fresh();
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = applyReview(s, 0.96, s.dueAt, noFuzz);
      intervals.push(s.intervalDays);
    }
    for (let i = 2; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it('classifies health by overdue days', () => {
    const s = fresh(); // due at t0 + 1 day
    expect(healthOf(s, t0)).toBe('fresh');
    expect(healthOf(s, s.dueAt)).toBe('fading');
    expect(healthOf(s, s.dueAt + 3 * DAY)).toBe('fading');
    expect(healthOf(s, s.dueAt + 3.1 * DAY)).toBe('atRisk');
  });

  it('serves the most overdue first, capped at 5', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ dueAt: t0 - i * DAY, id: i }));
    const queue = orderReviewQueue(items, t0);
    expect(queue).toHaveLength(5);
    expect(queue[0].id).toBe(7); // most overdue
  });
});
