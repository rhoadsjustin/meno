/**
 * App localization (UI copy only — Scripture text keeps its translation's
 * language; see docs/02-architecture.md §9).
 *
 * Pure: no React Native imports, so services and their unit tests can call
 * `t` directly. The device language is applied once at startup by
 * `src/i18n/device.ts`; until then (and in tests) everything renders English.
 * iOS relaunches the app when the user changes its language, so there is no
 * live-switch path to handle.
 */
import { createInstance } from 'i18next';

import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = { en, es } as const;

export const i18n = createInstance();

void i18n.init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: Object.keys(en),
  defaultNS: 'common',
  // React escapes for us; Scripture and references must render verbatim.
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export const t = i18n.t.bind(i18n);

/** The UI language in effect ('en' or 'es'). */
export function language(): Language {
  const lng = i18n.language as Language;
  return SUPPORTED_LANGUAGES.includes(lng) ? lng : 'en';
}

/**
 * BCP 47 tag for Intl formatting (dates, times, numbers). Holds the full
 * device locale (e.g. 'es-MX') so regional formats follow the user's region,
 * not just the language.
 */
let formattingLocale: string = 'en-US';

export function locale(): string {
  return formattingLocale;
}

/** Pick the best supported language for a device's preferred tags. */
export function resolveLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    const hit = SUPPORTED_LANGUAGES.find((l) => l === base);
    if (hit) return hit;
  }
  return 'en';
}

/** Apply the device's preferences. `tags` most-preferred first. */
export function applyLocale(tags: readonly string[]): void {
  const lng = resolveLanguage(tags);
  void i18n.changeLanguage(lng);
  const match = tags.find((tag) => tag.toLowerCase().startsWith(lng));
  formattingLocale = match ?? lng;
}
