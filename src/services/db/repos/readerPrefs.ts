/** What the Reader remembers, in the settings table: text size and the place in each book. */
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';

const TEXT_SIZE_KEY = 'readerTextSize';

/** The stored text size in points, or null when none was ever chosen. */
export async function readerTextSize(): Promise<number | null> {
  const value = await read(TEXT_SIZE_KEY);
  const size = Number(value);
  return value !== undefined && Number.isFinite(size) ? size : null;
}

export async function setReaderTextSize(size: number): Promise<void> {
  await write(TEXT_SIZE_KEY, String(size));
}

/** The chapter of `bookId` the reader last moved to, or null. */
export async function readingPlace(bookId: string): Promise<number | null> {
  const chapter = Number(await read(`readerPlace:${bookId}`));
  return Number.isInteger(chapter) && chapter > 0 ? chapter : null;
}

export async function rememberReadingPlace(bookId: string, chapter: number): Promise<void> {
  await write(`readerPlace:${bookId}`, String(chapter));
}

async function read(key: string): Promise<string | undefined> {
  const rows = await db.select().from(tables.settings).where(eq(tables.settings.key, key)).limit(1);
  return rows[0]?.value;
}

async function write(key: string, value: string): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}
