/** Goal-wizard defaults remembered in the settings table. */
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';

const LAST_TRANSLATION_KEY = 'lastTranslationId';

/** The translation last chosen in the wizard; may name one no longer available. */
export async function lastTranslationId(): Promise<string | null> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, LAST_TRANSLATION_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function rememberTranslation(translationId: string): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key: LAST_TRANSLATION_KEY, value: translationId })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: translationId } });
}
