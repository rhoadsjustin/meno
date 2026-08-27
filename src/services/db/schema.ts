/**
 * App database schema (docs/02-architecture.md §4). User data only —
 * bundled Scripture text lives in the read-only asset DB owned by
 * services/bible; the `verses` table here holds licensed API cache
 * (`api_cached`) rows exclusively.
 */
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const translations = sqliteTable('translations', {
  id: text('id').primaryKey(),
  abbrev: text('abbrev').notNull(),
  name: text('name').notNull(),
  languageCode: text('languageCode').notNull(),
  licenseType: text('licenseType', {
    enum: ['public_domain', 'api_cached', 'api_ephemeral'],
  }).notNull(),
  source: text('source', { enum: ['bundled', 'api_bible', 'esv_api'] }).notNull(),
  isDownloaded: integer('isDownloaded', { mode: 'boolean' }).notNull().default(false),
});

export const verses = sqliteTable(
  'verses',
  {
    translationId: text('translationId').notNull(),
    bookId: text('bookId').notNull(),
    chapter: integer('chapter').notNull(),
    verse: integer('verse').notNull(),
    text: text('text').notNull(),
  },
  (t) => [primaryKey({ columns: [t.translationId, t.bookId, t.chapter, t.verse] })]
);

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  translationId: text('translationId').notNull(),
  startBookId: text('startBookId').notNull(),
  startChapter: integer('startChapter').notNull(),
  startVerse: integer('startVerse').notNull(),
  endBookId: text('endBookId').notNull(),
  endChapter: integer('endChapter').notNull(),
  endVerse: integer('endVerse').notNull(),
  title: text('title').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  targetDate: integer('targetDate', { mode: 'timestamp_ms' }),
  status: text('status', { enum: ['active', 'completed', 'archived'] })
    .notNull()
    .default('active'),
  challengeId: text('challengeId'),
});

export const chunks = sqliteTable(
  'chunks',
  {
    id: text('id').primaryKey(),
    goalId: text('goalId')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    orderIndex: integer('orderIndex').notNull(),
    startBookId: text('startBookId').notNull(),
    startChapter: integer('startChapter').notNull(),
    startVerse: integer('startVerse').notNull(),
    endBookId: text('endBookId').notNull(),
    endChapter: integer('endChapter').notNull(),
    endVerse: integer('endVerse').notNull(),
    /** Highest tier passed, 0–6; -1 = none yet (fresh chunk); 6 = memorized. */
    tier: integer('tier').notNull().default(-1),
    status: text('status', { enum: ['locked', 'active', 'learning', 'memorized'] })
      .notNull()
      .default('locked'),
    memorizedAt: integer('memorizedAt', { mode: 'timestamp_ms' }),
  },
  (t) => [index('chunks_goalId_idx').on(t.goalId, t.orderIndex)]
);

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    chunkId: text('chunkId')
      .notNull()
      .references(() => chunks.id, { onDelete: 'cascade' }),
    mode: text('mode', {
      enum: ['read', 'firstLetters', 'blanks25', 'blanks50', 'blanks75', 'arrange', 'type', 'speak'],
    }).notNull(),
    /** 0–1. */
    accuracy: real('accuracy').notNull(),
    durationMs: integer('durationMs').notNull(),
    /** JSON array of missed word indices/words. */
    missedWords: text('missedWords', { mode: 'json' }).notNull().default('[]'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    source: text('source', { enum: ['practice', 'review', 'popquiz', 'unlock'] }).notNull(),
  },
  (t) => [index('attempts_chunkId_idx').on(t.chunkId, t.createdAt)]
);

export const reviewItems = sqliteTable(
  'reviewItems',
  {
    id: text('id').primaryKey(),
    chunkId: text('chunkId')
      .notNull()
      .references(() => chunks.id, { onDelete: 'cascade' }),
    easiness: real('easiness').notNull().default(2.5),
    intervalDays: real('intervalDays').notNull().default(1),
    repetitions: integer('repetitions').notNull().default(0),
    dueAt: integer('dueAt', { mode: 'timestamp_ms' }).notNull(),
    lastReviewedAt: integer('lastReviewedAt', { mode: 'timestamp_ms' }),
    health: text('health', { enum: ['fresh', 'fading', 'atRisk'] })
      .notNull()
      .default('fresh'),
  },
  (t) => [index('reviewItems_dueAt_idx').on(t.dueAt)]
);

export const streaks = sqliteTable('streaks', {
  /** Singleton row, id = 1. */
  id: integer('id').primaryKey(),
  current: integer('current').notNull().default(0),
  longest: integer('longest').notNull().default(0),
  /** ISO date (YYYY-MM-DD) in the user's local time zone. */
  lastActiveDate: text('lastActiveDate'),
  graceDaysAvailable: integer('graceDaysAvailable').notNull().default(1),
  graceDaysUsedThisWeek: integer('graceDaysUsedThisWeek').notNull().default(0),
});

export const badges = sqliteTable('badges', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  earnedAt: integer('earnedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const lockConfig = sqliteTable('lockConfig', {
  /** Singleton row, id = 1. */
  id: integer('id').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  mode: text('mode', { enum: ['firstPickup', 'everyPickup', 'schedule'] })
    .notNull()
    .default('firstPickup'),
  relockMinutes: integer('relockMinutes'),
  scheduleJson: text('scheduleJson', { mode: 'json' }),
  verseSource: text('verseSource', { enum: ['current', 'randomMemorized'] })
    .notNull()
    .default('current'),
  overrideStyle: text('overrideStyle', { enum: ['instant', 'hold10s'] })
    .notNull()
    .default('instant'),
  /** Opaque FamilyActivitySelection token from the native picker. */
  activitySelectionToken: text('activitySelectionToken'),
});

export const lockEvents = sqliteTable('lockEvents', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['shielded', 'reciteSuccess', 'override'] }).notNull(),
  verseChunkId: text('verseChunkId'),
  accuracy: real('accuracy'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
