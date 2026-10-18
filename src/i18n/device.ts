/** Reads the device's language preferences (expo-localization) into src/i18n. */
import { getLocales } from 'expo-localization';

import { applyLocale } from '@/i18n';

export function applyDeviceLocale(): void {
  applyLocale(getLocales().map((l) => l.languageTag));
}
