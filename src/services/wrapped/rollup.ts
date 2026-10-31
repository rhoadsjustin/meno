/**
 * The year's numbers (docs/09 §2, docs/10 §2 and §4). Pure: every date is
 * read through the injected clock, so tests pin the time zone.
 */
import { INITIAL_STREAK, recordActivity } from '@/services/streaks';
import { ALSO_PERSONAS_MAX, personasFor } from '@/services/wrapped/persona';
import { firstSeasonCutoff } from '@/services/wrapped/season';
import type {
  CardId,
  LocalClock,
  PassageOfYear,
  RecapInput,
  YearRecap,
} from '@/services/wrapped/types';

/** Fewer active days than this and there is no recap yet (docs/10 §4). */
export const RECAP_MIN_DAYS = 3;
/** The minutes card waits until there is enough time to be worth saying. */
export const MINUTES_CARD_MIN = 10;

const MINUTE_MS = 60_000;

export type RollupOptions = {
  year: number;
  clock: LocalClock;
};

/** The device's own time zone. */
export const deviceClock: LocalClock = {
  dayOf(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  },
  hourOf: (date) => date.getHours(),
};

export function rollupYear(input: RecapInput, { year, clock }: RollupOptions): YearRecap {
  const prefix = `${year}-`;
  const inYear = (date: Date) => clock.dayOf(date).startsWith(prefix);

  const attempts = input.attempts.filter((a) => inYear(a.createdAt));

  const days = new Set<string>(attempts.map((a) => clock.dayOf(a.createdAt)));
  for (const day of input.keptDays) if (day.startsWith(prefix)) days.add(day);
  const sortedDays = [...days].sort();

  // Replay the year's days through the streak's own rules, so "longest run"
  // means what the ember meant all year, grace days included.
  let streak = { ...INITIAL_STREAK };
  let graceDaysHonored = 0;
  for (const day of sortedDays) {
    const update = recordActivity(streak, day);
    streak = update.state;
    if (update.graceUsedOn) graceDaysHonored += 1;
  }
  const longestRun = streak.longest;

  const memorized = input.chunks.filter((c) => c.memorizedAt && inYear(c.memorizedAt));
  const versesMemorized = memorized.reduce((sum, c) => sum + c.verses, 0);
  const wordsMemorized = memorized.some((c) => c.words === null)
    ? null
    : memorized.reduce((sum, c) => sum + (c.words ?? 0), 0);

  const totalMs = attempts.reduce((sum, a) => sum + Math.max(0, a.durationMs), 0);
  const minutes = Math.round(totalMs / MINUTE_MS);
  const spokenRecitations = attempts.filter((a) => a.mode === 'speak').length;
  const reviews = attempts.filter((a) => a.source === 'review').length;
  const unlocks = input.unlocks.filter(inYear).length;

  const badges = input.badges
    .filter((b) => inYear(b.earnedAt))
    .sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())
    .map((b) => b.code);

  const passage = passageOfYear(input, attempts);

  const personas = personasFor({
    hours: attempts.map((a) => clock.hourOf(a.createdAt)),
    modes: attempts.map((a) => a.mode),
    activeDays: days.size,
    longestRun,
  });

  const firstDay = sortedDays[0];
  const span: YearRecap['span'] =
    firstDay && firstDay >= firstSeasonCutoff(year)
      ? { kind: 'firstSeason', month: Number(firstDay.slice(5, 7)) }
      : { kind: 'year' };

  const eligible = days.size >= RECAP_MIN_DAYS;

  const recap: Omit<YearRecap, 'cards'> = {
    year,
    span,
    eligible,
    activeDays: days.size,
    longestRun,
    graceDaysHonored,
    chunksMemorized: memorized.length,
    versesMemorized,
    wordsMemorized,
    minutes,
    attempts: attempts.length,
    reviews,
    spokenRecitations,
    unlocks,
    badges,
    passage,
    persona: personas[0] ?? null,
    alsoPersonas: personas.slice(1, 1 + ALSO_PERSONAS_MAX),
  };
  return { ...recap, cards: cardsFor(recap) };
}

/** The goal the year was spent in: most time, then most attempts, then list order. */
function passageOfYear(
  input: RecapInput,
  attempts: RecapInput['attempts'],
): PassageOfYear | null {
  const totals = new Map<string, { ms: number; count: number }>();
  for (const a of attempts) {
    const t = totals.get(a.goalId) ?? { ms: 0, count: 0 };
    t.ms += Math.max(0, a.durationMs);
    t.count += 1;
    totals.set(a.goalId, t);
  }
  let best: PassageOfYear | null = null;
  let bestMs = -1;
  for (const goal of input.goals) {
    const t = totals.get(goal.id);
    if (!t) continue;
    if (t.ms > bestMs || (t.ms === bestMs && best && t.count > best.attempts)) {
      best = { ...goal, minutes: Math.round(t.ms / MINUTE_MS), attempts: t.count };
      bestMs = t.ms;
    }
  }
  return best;
}

/** Which cards have something worth saying (docs/10 §2 thresholds). */
export function cardsFor(recap: Omit<YearRecap, 'cards'>): CardId[] {
  if (!recap.eligible) return [];
  const cards: CardId[] = ['cover'];
  if (recap.chunksMemorized > 0) cards.push('words');
  if (recap.passage) cards.push('passage');
  cards.push('days');
  if (recap.minutes >= MINUTES_CARD_MIN) cards.push('minutes');
  if (recap.spokenRecitations > 0) cards.push('spoken');
  if (recap.unlocks > 0) cards.push('unlocks');
  if (recap.persona) cards.push('persona');
  if (recap.badges.length > 0) cards.push('badges');
  cards.push('summary');
  return cards;
}
