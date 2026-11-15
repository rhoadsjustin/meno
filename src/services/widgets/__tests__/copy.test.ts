import { afterEach, describe, expect, it } from 'vitest';

import { applyLocale } from '@/i18n';
import { withCopy, type WidgetData } from '@/services/widgets/copy';
import { emptyTextVariants } from '@/services/widgets/modes';

function data(overrides: Partial<WidgetData> = {}): WidgetData {
  return {
    ...emptyTextVariants(),
    verseRef: 'Philippians 4:6',
    verseRefShort: 'Phil 4:6',
    autoMode: 'full',
    memorized: false,
    streak: 12,
    streakActiveToday: true,
    dueCount: 0,
    translationAbbrev: 'WEB',
    weekGrid: '1101011',
    dueRefs: '',
    hasGoal: true,
    ...overrides,
  };
}

afterEach(() => applyLocale(['en-US']));

describe('withCopy', () => {
  it('says the streak and whether today is done, for VoiceOver', () => {
    expect(withCopy(data()).streakLabel).toBe('12-day streak, practiced today');
    expect(withCopy(data({ streakActiveToday: false })).streakLabel).toBe(
      '12-day streak, not yet practiced today',
    );
    expect(withCopy(data({ streak: 0, streakActiveToday: false })).streakLabel).toBe('No streak yet');
  });

  it('counts the week grid instead of leaving its squares to be read', () => {
    expect(withCopy(data()).weekLabel).toBe('Practiced 5 of the last 7 days');
    expect(withCopy(data({ weekGrid: '0000000' })).weekLabel).toBe('Practiced 0 of the last 7 days');
  });

  it('gives every family something to show with no passage chosen', () => {
    const copy = withCopy(data({ hasGoal: false, verseRef: '', verseRefShort: '' }));
    expect(copy.emptyPrompt).toBe('Pick a passage to begin.');
    expect(copy.inlineEmpty).toBe('Pick a passage');
  });

  it('keeps the due line and the reference note', () => {
    expect(withCopy(data()).dueLine).toBe('Nothing due — well kept.');
    expect(withCopy(data({ dueRefs: 'John 3:16 · Psalms 23:1' })).dueLine).toBe(
      'Due: John 3:16 · Psalms 23:1',
    );
    expect(withCopy(data()).referenceNote).toBe('From memory.');
    expect(withCopy(data({ memorized: true })).referenceNote).toBe('You know this one.');
  });

  it('renders in Spanish', () => {
    applyLocale(['es-MX']);
    const copy = withCopy(data({ streak: 1, streakActiveToday: false }));
    expect(copy.streakLabel).toBe('Racha de 1 día, aún sin practicar hoy');
    expect(copy.weekLabel).toBe('Practicaste 5 de los últimos 7 días');
    expect(copy.inlineEmpty).toBe('Elige un pasaje');
  });
});
