/**
 * Year-end snapshot (docs/10 §5.4). Once a year is over its recap is kept,
 * so deleting a passage later (which deletes its attempts, 02 §5) can't
 * change what the user already saw or shared. Numbers, references, the
 * goal's own title and codes only: never verse text.
 */
import type { CardId, PersonaCode, YearRecap } from '@/services/wrapped/types';

export const SNAPSHOT_VERSION = 1;

export function snapshotKey(year: number): string {
  return `wrapped:${year}`;
}

export function serializeRecap(recap: YearRecap): string {
  return JSON.stringify({ v: SNAPSHOT_VERSION, recap });
}

const CARDS: readonly CardId[] = [
  'cover', 'words', 'passage', 'days', 'minutes', 'spoken', 'unlocks', 'persona', 'badges', 'summary',
];
const PERSONAS: readonly PersonaCode[] = [
  'morningWatch', 'nightMeditator', 'middayPause', 'voiceInTheRoom', 'faithfulKeeper', 'steadyWalker',
];

/** A stored snapshot for `year`, or null when absent, malformed or from another format. */
export function parseRecap(raw: string | null | undefined, year: number): YearRecap | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { v?: unknown; recap?: Partial<YearRecap> };
    const r = data.recap;
    if (data.v !== SNAPSHOT_VERSION || !r || r.year !== year) return null;
    const numbers = [
      r.activeDays, r.longestRun, r.graceDaysHonored, r.chunksMemorized, r.versesMemorized,
      r.minutes, r.attempts, r.reviews, r.spokenRecitations, r.unlocks,
    ];
    if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return null;
    if (!Array.isArray(r.cards) || !r.cards.every((c) => CARDS.includes(c))) return null;
    if (r.persona !== null && !PERSONAS.includes(r.persona as PersonaCode)) return null;
    if (!Array.isArray(r.badges) || typeof r.eligible !== 'boolean' || !r.span) return null;
    return r as YearRecap;
  } catch {
    return null;
  }
}
