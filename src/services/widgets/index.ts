/**
 * Widget snapshot publishing (docs/05 §1). Builds precomputed display
 * strings (the widget runtime can't run app code) and pushes a two-entry
 * timeline: now, plus one just after local midnight so streak/day state
 * rolls over without opening the app.
 *
 * License rule (02 §5): verse text only ships to the widget for
 * translations whose license permits persisting text.
 */
import { Platform } from 'react-native';

import { formatRange, getPassage, getTranslation, mayPersistText } from '@/services/bible';
import { activeGoal, chunksForGoal, currentChunk } from '@/services/db/repos/goals';
import { dueReviewItems, countDueReviews } from '@/services/db/repos/reviews';
import { loadStats } from '@/services/db/repos/stats';
import { currentStreakDisplay } from '@/services/db/repos/streaks';
import { db, tables } from '@/services/db';
import { firstLetters, displayTokens, selectBlanks } from '@/services/practice';
import { eq } from 'drizzle-orm';

import type { MenoWidgetProps } from '@/widgets/MenoWidget';

/** Blank out ~50% of words for the tier 3–4 dissolution stage. */
function blanked50(text: string, seed: string): string {
  const tokens = displayTokens(text);
  const blanks = new Set(selectBlanks(text, 0.5, seed, 0));
  return tokens
    .map((t, i) =>
      blanks.has(i) ? `${t.prefix}${'_'.repeat(Math.min(t.word.length, 6))}${t.suffix}` : `${t.prefix}${t.word}${t.suffix}`
    )
    .join(' ');
}

async function buildProps(): Promise<MenoWidgetProps> {
  const [streak, dueCount, stats] = await Promise.all([
    currentStreakDisplay(),
    countDueReviews(),
    loadStats(1),
  ]);

  const base: MenoWidgetProps = {
    verseRef: '',
    displayText: '',
    mono: false,
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
    // Everything memorized — celebrate quietly with the goal reference.
    base.verseRef = goal.title;
    base.memorized = true;
    return base;
  }

  const range = {
    start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
    end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
  };
  base.verseRef = formatRange(range);

  if (chunk.tier >= 6) {
    base.memorized = true;
    return base;
  }

  // Tier-based dissolution (05 §1): full (≤2) → 50% blanked (3–4) → first
  // letters (5). Text only if the license permits persisting it.
  if (!mayPersistText(goal.translationId)) {
    base.displayText = '';
    base.mono = false;
    return base;
  }
  const verses = await getPassage(goal.translationId, range);
  const text = verses.map((v) => v.text).join(' ');
  if (chunk.tier >= 5) {
    base.displayText = firstLetters(text);
    base.mono = true;
  } else if (chunk.tier >= 3) {
    base.displayText = blanked50(text, chunk.id);
    base.mono = false;
  } else {
    base.displayText = text;
    base.mono = false;
  }
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
