import { describe, expect, it } from 'vitest';

import { windowLayout } from '@/components/window-layout';

// The iPhone Duo poses named in CLAUDE.md's Duo gate, plus the windows
// around them.
describe('windowLayout', () => {
  it('closed (cover panel, 466pt wide): one column, short', () => {
    expect(windowLayout(466, 678)).toEqual({
      isWide: false,
      twoPane: false,
      isExtraWide: false,
      short: true,
    });
  });

  it('open (951×669): two panes with a rail, short', () => {
    expect(windowLayout(951, 669)).toEqual({
      isWide: true,
      twoPane: true,
      isExtraWide: true,
      short: true,
    });
  });

  it('open + rotated (669×951): wide, but one column — taller than wide', () => {
    expect(windowLayout(669, 951)).toEqual({
      isWide: true,
      twoPane: false,
      isExtraWide: false,
      short: false,
    });
  });

  it('a regular iPhone is one column in both orientations until it is wide', () => {
    expect(windowLayout(402, 874).twoPane).toBe(false);
    // Landscape: wider than tall and past the breakpoint.
    expect(windowLayout(874, 402)).toMatchObject({ twoPane: true, short: true });
    // A small phone in landscape is wider than tall but not wide.
    expect(windowLayout(568, 320).twoPane).toBe(false);
  });

  it('a square window is not wider than tall', () => {
    expect(windowLayout(700, 700).twoPane).toBe(false);
  });

  it('never offers two panes on a window that is not wide', () => {
    for (const [w, h] of [
      [320, 200],
      [466, 300],
      [599, 400],
    ] as const) {
      expect(windowLayout(w, h)).toMatchObject({ isWide: false, twoPane: false });
    }
  });

  it('short ends at 720pt', () => {
    expect(windowLayout(402, 719).short).toBe(true);
    expect(windowLayout(402, 720).short).toBe(false);
  });
});
