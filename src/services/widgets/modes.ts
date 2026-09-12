/**
 * Widget practice modes (docs/05 §1).
 *
 * Every placed widget chooses how much of the verse it reveals — full text,
 * blanks at three densities, first letters, or reference only — through the
 * iOS "Edit Widget" sheet. That sheet is an AppIntent the expo-widgets config
 * plugin generates from the `configuration.parameters` block in app.config.ts;
 * WidgetKit owns the chosen value and hands it to the layout as
 * `environment.configuration.mode`.
 *
 * The app cannot read that choice, and the widget runtime cannot run app code,
 * so a snapshot ships EVERY variant precomputed and the layout picks one at
 * render time. Variants are cheap (a chunk is a verse or two) and this keeps
 * mode switching instant — no app launch, no timeline rebuild.
 */
import { displayTokens, firstLetters, selectBlanks } from '@/services/practice';

/** What a widget instance shows. `auto` follows the chunk's tier. */
export type WidgetPracticeMode =
  | 'auto'
  | 'full'
  | 'blanks25'
  | 'blanks50'
  | 'blanks75'
  | 'firstLetters'
  | 'reference';

/** A mode after `auto` has been resolved against the tier ladder. */
export type ResolvedWidgetMode = Exclude<WidgetPracticeMode, 'auto'>;

/** The precomputed verse renderings shipped with every snapshot. */
export type WidgetTextVariants = {
  textFull: string;
  textBlanks25: string;
  textBlanks50: string;
  textBlanks75: string;
  textFirstLetters: string;
};

/** All-empty variants — no goal, no chunk, or a license that forbids text. */
export function emptyTextVariants(): WidgetTextVariants {
  return {
    textFull: '',
    textBlanks25: '',
    textBlanks50: '',
    textBlanks75: '',
    textFirstLetters: '',
  };
}

/** Blanks out `density` of the words, keeping punctuation and a length cue. */
function blanked(text: string, density: number, seed: string): string {
  const tokens = displayTokens(text);
  const blanks = new Set(selectBlanks(text, density, seed, 0));
  return tokens
    .map((t, i) =>
      blanks.has(i)
        ? `${t.prefix}${'_'.repeat(Math.min(t.word.length, 6))}${t.suffix}`
        : `${t.prefix}${t.word}${t.suffix}`
    )
    .join(' ');
}

/**
 * Renders `text` in every mode. `seed` (the chunk id) keeps blank placement
 * stable across republishes, so the widget doesn't reshuffle on each refresh.
 */
export function buildTextVariants(text: string, seed: string): WidgetTextVariants {
  if (!text) return emptyTextVariants();
  return {
    textFull: text,
    textBlanks25: blanked(text, 0.25, seed),
    textBlanks50: blanked(text, 0.5, seed),
    textBlanks75: blanked(text, 0.75, seed),
    textFirstLetters: firstLetters(text),
  };
}

/**
 * The mode `auto` resolves to: the tier-based dissolution of docs/05 §1 —
 * full (0–2) → 50% blanked (3–4) → first letters (5) → reference (memorized).
 */
export function autoModeForTier(tier: number): ResolvedWidgetMode {
  if (tier >= 6) return 'reference';
  if (tier >= 5) return 'firstLetters';
  if (tier >= 3) return 'blanks50';
  return 'full';
}
