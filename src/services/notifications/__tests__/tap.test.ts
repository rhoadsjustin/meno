import { describe, expect, it } from 'vitest';

import { tapNavigation } from '@/services/notifications/tap';

describe('tapNavigation', () => {
  it('stays when the target is already in front', () => {
    expect(tapNavigation('/review', '/review')).toBe('stay');
    expect(tapNavigation('/', '/')).toBe('stay');
    expect(tapNavigation('/wrapped', '/wrapped?year=2026')).toBe('stay');
    expect(tapNavigation('/review/', '/review')).toBe('stay');
  });

  it('pushes from a tab, where nothing is open to dismiss', () => {
    expect(tapNavigation('/', '/review')).toBe('push');
    expect(tapNavigation('/library', '/')).toBe('push');
    expect(tapNavigation('/settings', '/wrapped')).toBe('push');
  });

  it('clears an open session or sheet first', () => {
    expect(tapNavigation('/practice/12', '/review')).toBe('reset');
    expect(tapNavigation('/help', '/review')).toBe('reset');
    expect(tapNavigation('/review', '/')).toBe('reset');
    expect(tapNavigation('/reader/John.3.1', '/wrapped')).toBe('reset');
  });

  it('never dismisses onboarding or the unlock quiz', () => {
    expect(tapNavigation('/onboarding', '/review')).toBe('push');
    expect(tapNavigation('/unlock', '/')).toBe('push');
  });
});
