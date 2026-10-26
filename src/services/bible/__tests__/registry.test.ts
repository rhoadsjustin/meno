import { afterEach, describe, expect, it } from 'vitest';

import {
  clearRegisteredTranslations,
  duplicatesBundled,
  getTranslation,
  registerTranslations,
  registeredTranslations,
  translationHasBook,
  unregisterTranslation,
  youversionBibleId,
  youversionTranslationId,
} from '@/services/bible/registry';
import type { Translation } from '@/services/bible/types';

const yv = (id: number, abbrev: string, over: Partial<Translation> = {}): Translation => ({
  id: youversionTranslationId(id),
  abbrev,
  name: abbrev,
  languageCode: 'en',
  licenseType: 'api_ephemeral',
  source: 'youversion',
  isDownloaded: false,
  attribution: '',
  ...over,
});

afterEach(clearRegisteredTranslations);

describe('runtime translations', () => {
  it('registers, resolves, and unregisters Platform versions', () => {
    registerTranslations([yv(3034, 'BSB')]);
    expect(getTranslation('yv-3034').abbrev).toBe('BSB');
    expect(registeredTranslations().map((t) => t.id)).toEqual(['yv-3034']);
    unregisterTranslation('yv-3034');
    expect(registeredTranslations()).toEqual([]);
  });

  it('never lets a runtime entry shadow a static one', () => {
    registerTranslations([{ ...yv(1, 'WEB'), id: 'web' }]);
    expect(getTranslation('web').source).toBe('bundled');
  });

  it('gives unknown Platform ids a numbered placeholder and rejects other ids', () => {
    expect(youversionBibleId('yv-111')).toBe(111);
    expect(youversionBibleId('esv')).toBeNull();
    const t = getTranslation('yv-111');
    expect(t.source).toBe('youversion');
    expect(t.abbrev).toBe('Bible 111');
    expect(t.licenseType).toBe('api_ephemeral');
    expect(() => getTranslation('nope')).toThrow(/Unknown translation/);
  });

  it('spots Platform copies of bundled text', () => {
    expect(duplicatesBundled(yv(12, 'ASV'))).toBe(true);
    expect(duplicatesBundled(yv(206, 'WEBUS'))).toBe(true);
    expect(duplicatesBundled(yv(3034, 'BSB'))).toBe(false);
    expect(duplicatesBundled(getTranslation('asv'))).toBe(false);
  });

  it('knows which books a partial version has', () => {
    const nt = yv(3427, 'TCENT', { books: ['Matt', 'Mark'] });
    expect(translationHasBook(nt, 'Matt')).toBe(true);
    expect(translationHasBook(nt, 'Gen')).toBe(false);
    expect(translationHasBook(yv(12, 'ASV'), 'Gen')).toBe(true);
    expect(translationHasBook(yv(12, 'ASV'), 'Tob')).toBe(false);
  });
});
