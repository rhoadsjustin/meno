import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  INTERNAL_ROOTS,
  LINKABLE_ROOTS,
  normalizeLinkPath,
  resolveIncomingLink,
  screensAboveOpenSession,
} from '@/services/links';

const APP_DIR = fileURLToPath(new URL('../../../app', import.meta.url));

/** A root is a route file, a route folder, or a tab. */
function hasRoute(root: string): boolean {
  return [`${root}.tsx`, root, `(tabs)/${root}.tsx`, `(tabs)/${root}`].some((p) =>
    existsSync(`${APP_DIR}/${p}`),
  );
}

describe('deep-link roots', () => {
  it.each([...LINKABLE_ROOTS, ...INTERNAL_ROOTS])('%s has a route under src/app', (root) => {
    expect(hasRoute(root)).toBe(true);
  });

  it('lists no root twice', () => {
    const all = [...LINKABLE_ROOTS, ...INTERNAL_ROOTS];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('normalizeLinkPath', () => {
  it('re-roots host-style links', () => {
    expect(normalizeLinkPath('meno://practice')).toBe('/practice');
    expect(normalizeLinkPath('meno://help')).toBe('/help');
    expect(normalizeLinkPath('meno://challenge?v=1&c=abc')).toBe('/challenge?v=1&c=abc');
    expect(normalizeLinkPath('meno://reader/John.3.1')).toBe('/reader/John.3.1');
  });

  it('keeps path-style links', () => {
    expect(normalizeLinkPath('meno:///wrapped?year=2026')).toBe('/wrapped?year=2026');
    expect(normalizeLinkPath('/review')).toBe('/review');
  });

  it('strips the universal-link host', () => {
    expect(normalizeLinkPath('https://meno-scripture.org/challenge?c=abc')).toBe(
      '/challenge?c=abc',
    );
    expect(normalizeLinkPath('https://www.meno-scripture.org/')).toBe('/');
  });

  it('sends an empty link to Today', () => {
    expect(normalizeLinkPath('meno://')).toBe('/');
    expect(normalizeLinkPath('meno:///')).toBe('/');
  });

  it('leaves unknown first segments for the router to reject', () => {
    expect(normalizeLinkPath('meno://nowhere')).toBe('meno://nowhere');
  });
});

describe('resolveIncomingLink', () => {
  const warm = { initial: false, practiceInFront: true };

  it('drops the widget link while a practice session is in front', () => {
    expect(resolveIncomingLink('meno:///practice', warm)).toBeNull();
    expect(resolveIncomingLink('meno://practice', warm)).toBeNull();
    expect(resolveIncomingLink('/practice/', warm)).toBeNull();
  });

  it('opens the session when none is in front, and on a cold start', () => {
    expect(
      resolveIncomingLink('meno:///practice', { initial: false, practiceInFront: false }),
    ).toBe('/practice');
    expect(resolveIncomingLink('meno:///practice', { initial: true, practiceInFront: true })).toBe(
      '/practice',
    );
  });

  it('lets every other link through from a session', () => {
    expect(resolveIncomingLink('meno:///', warm)).toBe('/');
    expect(resolveIncomingLink('meno://review', warm)).toBe('/review');
    expect(resolveIncomingLink('meno://practice/12', warm)).toBe('/practice/12');
  });
});

describe('screensAboveOpenSession', () => {
  it('finds no session on an ordinary tap', () => {
    expect(screensAboveOpenSession(['(tabs)', 'practice/index'])).toBeNull();
    expect(screensAboveOpenSession(['(tabs)', 'review/index', 'practice/index'])).toBeNull();
  });

  it('counts the screens over an open session, the redirect included', () => {
    expect(screensAboveOpenSession(['(tabs)', 'practice/[goalId]', 'practice/index'])).toBe(1);
    expect(
      screensAboveOpenSession(['(tabs)', 'practice/[goalId]', 'help', 'practice/index']),
    ).toBe(2);
  });
});
