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

const REMINDER_PROMPT_KEY = 'reminderPromptDismissed';

/** Today's one-time "reminders are off" prompt has been answered or closed. */
export async function reminderPromptDismissed(): Promise<boolean> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, REMINDER_PROMPT_KEY))
    .limit(1);
  return rows[0]?.value === 'true';
}

export async function dismissReminderPrompt(): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key: REMINDER_PROMPT_KEY, value: 'true' })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: 'true' } });
}

const WRAPPED_PREVIEW_KEY = 'wrappedPreview';

/**
 * Year in the Word preview (docs/10 §7): set by opening
 * `meno:///wrapped?preview=1`, it shows the recap's entry points out of
 * season so testers can try it before December. Harmless if anyone finds it.
 */
export async function wrappedPreview(): Promise<boolean> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, WRAPPED_PREVIEW_KEY))
    .limit(1);
  return rows[0]?.value === 'true';
}

export async function setWrappedPreview(on: boolean): Promise<void> {
  const value = on ? 'true' : 'false';
  await db
    .insert(tables.settings)
    .values({ key: WRAPPED_PREVIEW_KEY, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}

/** The year's recap has been opened: no notice needs to announce it. */
export async function recapSeen(year: number): Promise<boolean> {
  return (await readFlag(`wrappedSeen:${year}`)) === 'true';
}

export async function markRecapSeen(year: number): Promise<void> {
  await writeFlag(`wrappedSeen:${year}`, 'true');
}

/** When the December notice was planned for (epoch ms), so re-plans keep it. */
export async function recapNoticeAt(year: number): Promise<Date | null> {
  const ms = Number(await readFlag(`wrappedNoticeAt:${year}`));
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : null;
}

export async function setRecapNoticeAt(year: number, at: Date): Promise<void> {
  await writeFlag(`wrappedNoticeAt:${year}`, String(at.getTime()));
}

async function readFlag(key: string): Promise<string | undefined> {
  const rows = await db.select().from(tables.settings).where(eq(tables.settings.key, key)).limit(1);
  return rows[0]?.value;
}

async function writeFlag(key: string, value: string): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}
