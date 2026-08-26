/**
 * App database (user data) — expo-sqlite + Drizzle. Scripture text is NOT
 * stored here except licensed API cache rows written by services/bible.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations as useDrizzleMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '../../../drizzle/migrations';
import * as schema from '@/services/db/schema';

export const APP_DB_NAME = 'meno.db';

const expoDb = openDatabaseSync(APP_DB_NAME, { enableChangeListener: true });
export const db = drizzle(expoDb, { schema });

/** Run pending migrations; call once at the app root before rendering data. */
export function useMigrations() {
  return useDrizzleMigrations(db, migrations);
}

export * as tables from '@/services/db/schema';
