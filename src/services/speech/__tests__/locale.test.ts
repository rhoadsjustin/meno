import { describe, expect, it } from 'vitest';

import { recognizerLocale } from '@/services/speech/locale';

/** SFSpeechRecognizer.supportedLocales() on iOS 27 / macOS 27, abridged. */
const IOS = [
  'ar-SA',
  'de-AT',
  'de-CH',
  'de-DE',
  'en-AU',
  'en-GB',
  'en-IN',
  'en-US',
  'es-CL',
  'es-ES',
  'es-MX',
  'es-US',
  'fr-CA',
  'fr-FR',
  'he-IL',
  'hi-IN',
  'nb-NO',
  'pt-BR',
  'pt-PT',
  'ru-RU',
  'yue-CN',
  'zh-CN',
  'zh-HK',
  'zh-TW',
];

describe('recognizerLocale', () => {
  it('resolves the Platform’s bare language ids to a regional recognizer', () => {
    expect(recognizerLocale('en', IOS)).toBe('en-US');
    expect(recognizerLocale('de', IOS)).toBe('de-DE');
    expect(recognizerLocale('fr', IOS)).toBe('fr-FR');
    expect(recognizerLocale('ar', IOS)).toBe('ar-SA');
    expect(recognizerLocale('pt', IOS)).toBe('pt-BR');
  });

  it('treats bare es and es-419 as Latin American Spanish', () => {
    expect(recognizerLocale('es', IOS)).toBe('es-MX');
    expect(recognizerLocale('es-419', IOS)).toBe('es-MX');
    expect(recognizerLocale('es-419', ['es-CL', 'es-ES'])).toBe('es-CL');
    expect(recognizerLocale('es-ES', IOS)).toBe('es-ES');
  });

  it('prefers the device’s own region for the language', () => {
    expect(recognizerLocale('es', IOS, ['es-ES'])).toBe('es-ES');
    expect(recognizerLocale('en-GB', IOS, ['en-US'])).toBe('en-US');
    expect(recognizerLocale('de', IOS, ['en-US', 'de-CH'])).toBe('de-CH');
    // A device region the recognizer lacks falls through to the text's.
    expect(recognizerLocale('en-GB', IOS, ['en-NZ'])).toBe('en-GB');
    // Other languages' device tags don't steer it.
    expect(recognizerLocale('pt', IOS, ['es-ES'])).toBe('pt-BR');
  });

  it('keeps an exact bundled code', () => {
    expect(recognizerLocale('en-US', IOS)).toBe('en-US');
    expect(recognizerLocale('en-GB', IOS)).toBe('en-GB');
  });

  it('matches Chinese by script, not just language', () => {
    expect(recognizerLocale('zh', IOS)).toBe('zh-CN');
    expect(recognizerLocale('zh-Hans', IOS)).toBe('zh-CN');
    expect(recognizerLocale('zh-Hant', IOS)).toBe('zh-TW');
    expect(recognizerLocale('zh-Hant-TW', IOS)).toBe('zh-TW');
    expect(recognizerLocale('zh-Hant-HK', IOS)).toBe('zh-HK');
    // A Traditional text never gets the Simplified recognizer.
    expect(recognizerLocale('zh-Hant', ['zh-CN'])).toBeNull();
    expect(recognizerLocale('zh-Hans', IOS, ['zh-TW'])).toBe('zh-CN');
  });

  it('refuses a text in a script the recognizer does not write', () => {
    expect(recognizerLocale('hi-Latn', IOS)).toBeNull();
    expect(recognizerLocale('hi-Deva', IOS)).toBe('hi-IN');
    expect(recognizerLocale('sr-Latn', ['sr-RS'])).toBeNull();
    expect(recognizerLocale('sr-Cyrl', ['sr-RS'])).toBe('sr-RS');
    // Unknown language with a script tag: not guessed.
    expect(recognizerLocale('rmn-Latn', ['rmn-RS'])).toBeNull();
  });

  it('maps retired codes and accepts underscores', () => {
    expect(recognizerLocale('no', IOS)).toBe('nb-NO');
    expect(recognizerLocale('iw', IOS)).toBe('he-IL');
    expect(recognizerLocale('de', ['de_DE'])).toBe('de-DE');
  });

  it('returns null when nothing can hear the language', () => {
    expect(recognizerLocale('sw', IOS)).toBeNull();
    expect(recognizerLocale('grc', IOS)).toBeNull();
    expect(recognizerLocale('und', IOS)).toBeNull();
    expect(recognizerLocale('', IOS)).toBeNull();
    expect(recognizerLocale('en', [])).toBeNull();
  });

  it('falls back to any region, alphabetically, when no rule applies', () => {
    expect(recognizerLocale('ca', ['ca-AD', 'ca-FR'])).toBe('ca-AD');
  });
});
