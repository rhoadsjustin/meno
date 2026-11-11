/**
 * Writes the Siri contexts the native checks run against (`npm run
 * test:siri`): the real output of services/siri for a bundled translation,
 * ESV, and YouVersion versions in English and Spanish.
 *
 *   tsx scripts/siri-fixtures.ts <out-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyLocale } from '@/i18n';
import { getTranslation, TRANSLATIONS } from '@/services/bible/registry';
import type { Translation } from '@/services/bible/types';
import { buildSiriContext } from '@/services/siri/context';

const out = process.argv[2];
if (!out) throw new Error('usage: tsx scripts/siri-fixtures.ts <out-dir>');
mkdirSync(out, { recursive: true });

const platform = (id: string, abbrev: string, name: string, languageCode: string): Translation => ({
  id,
  abbrev,
  name,
  languageCode,
  licenseType: 'api_ephemeral',
  source: 'youversion',
  isDownloaded: false,
  attribution: '© Biblica.',
});

function write(file: string, translation: Translation): void {
  const context = buildSiriContext({
    translation,
    bundled: TRANSLATIONS.filter((t) => t.source === 'bundled'),
    defaultTranslationId: 'web',
    bundledDb: 'bundled.db',
    appDb: 'meno.db',
  });
  writeFileSync(join(out, `${file}.json`), JSON.stringify(context));
}

write('web', getTranslation('web'));
write('kjv', getTranslation('kjv'));
write('esv', getTranslation('esv'));
write('niv', platform('yv-111', 'NIV', 'New International Version', 'en'));

applyLocale(['es-MX']);
write('nvi', platform('yv-128', 'NVI', 'Nueva Versión Internacional', 'es'));
write('web-es', getTranslation('web'));
