import { t } from '@/i18n';
import { getTranslation } from '@/services/bible/registry';

/**
 * Plain words for Scripture text that would not load, in place of whatever
 * the provider threw. Bundled text never needs the network; anything else
 * says that it does.
 */
export function loadFailureMessage(translationId: string, what: string): string {
  const translation = getTranslation(translationId);
  return translation.source === 'bundled'
    ? t('goals:passage.loadFailed', { what })
    : t('goals:passage.loadFailedRemote', { what, abbrev: translation.abbrev });
}
