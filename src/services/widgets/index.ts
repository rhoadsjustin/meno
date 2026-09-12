/**
 * Widget snapshot publishing (docs/05 §1). Builds precomputed display
 * strings (the widget runtime can't run app code) and pushes a two-entry
 * timeline: now, plus one just after local midnight so streak/day state
 * rolls over without opening the app.
 *
 * Each snapshot carries the verse in EVERY practice mode — full, blanks at
 * 25/50/75%, first letters — because the per-instance mode lives in WidgetKit
 * where the app can't read it (see services/widgets/modes). Changing the mode
 * in the Edit Widget sheet then re-renders instantly, with no app launch.
 *
 * License rule (02 §5): verse text only ships to the widget for
 * translations whose license permits persisting text.
 */
import { Platform } from 'react-native';

import { formatRange, getPassage, getTranslation, mayPersistText } from '@/services/bible';
import { activeGoal, currentChunk } from '@/services/db/repos/goals';
import { dueReviewItems, countDueReviews } from '@/services/db/repos/reviews';
import { loadStats } from '@/services/db/repos/stats';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { db, tables } from '@/services/db';
import { autoModeForTier, buildTextVariants, emptyTextVariants } from '@/services/widgets/modes';
import { eq } from 'drizzle-orm';

import type { MenoWidgetProps } from '@/widgets/MenoWidget';

async function buildProps(): Promise<MenoWidgetProps> {
  const [streak, dueCount, stats] = await Promise.all([
    currentStreakDisplay(),
    countDueReviews(),
    loadStats(1),
  ]);

  const base: MenoWidgetProps = {
    ...emptyTextVariants(),
    verseRef: '',
    autoMode: 'full',
    memorized: false,
    streak: streak.current,
    streakActiveToday: streak.activeToday,
    dueCount,
    translationAbbrev: '',
    weekGrid: stats.practiceDays
      .slice(-7)
      .map((d) => (d.practiced ? '1' : '0'))
      .join(''),
    dueRefs: '',
    hasGoal: false,
  };

  // Up to 3 due references for the large widget.
  const due = await dueReviewItems(3);
  const dueRefs: string[] = [];
  for (const item of due) {
    const rows = await db
      .select()
      .from(tables.chunks)
      .where(eq(tables.chunks.id, item.chunkId))
      .limit(1);
    const c = rows[0];
    if (c) {
      dueRefs.push(
        formatRange({
          start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
          end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
        })
      );
    }
  }
  base.dueRefs = dueRefs.join(' · ');

  const goal = await activeGoal();
  if (!goal) return base;
  const chunk = await currentChunk(goal.id);
  const translation = getTranslation(goal.translationId);
  base.translationAbbrev = translation.abbrev;
  base.hasGoal = true;

  if (!chunk) {
    // Everything memorized — celebrate quietly with the goal reference. There
    // is no chunk to render, so every mode falls back to reference-only.
    base.verseRef = goal.title;
    base.memorized = true;
    base.autoMode = 'reference';
    return base;
  }

  const range = {
    start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
    end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
  };
  base.verseRef = formatRange(range);
  base.memorized = chunk.tier >= 6;
  // What 'Match my progress' shows: the tier-based dissolution of 05 §1.
  base.autoMode = autoModeForTier(chunk.tier);

  // Text only if the license permits persisting it (02 §5). Without it every
  // mode degrades to reference-only — the widget reads empty text as such.
  if (!mayPersistText(goal.translationId)) return base;

  const verses = await getPassage(goal.translationId, range);
  const text = verses.map((v) => v.text).join(' ');
  // Seeded on the chunk so blank placement is stable across republishes.
  Object.assign(base, buildTextVariants(text, chunk.id));
  return base;
}

let publishing = false;

/** Publishes the widget timeline; call on background + after state changes. */
export async function publishWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (publishing) return;
  publishing = true;
  try {
    const { default: MenoWidget } = await import('@/widgets/MenoWidget');
    const props = await buildProps();
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 5, 0, 0);
    MenoWidget.updateTimeline([
      { date: new Date(), props },
      // Same content after midnight; the ember hollows out for the new day.
      { date: midnight, props: { ...props, streakActiveToday: false } },
    ]);
  } catch {
    // Widget publishing is best-effort (module absent in dev builds without
    // the extension, simulator quirks, etc.).
  } finally {
    publishing = false;
  }
}
