/** One-off app flags stored in the settings table. */
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';

const ONBOARDING_KEY = 'onboardingDone';

export async function onboardingDone(): Promise<boolean> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, ONBOARDING_KEY))
    .limit(1);
  return rows[0]?.value === 'true';
}

export async function markOnboardingDone(): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key: ONBOARDING_KEY, value: 'true' })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: 'true' } });
}
