/**
 * Everything the recap cards print, resolved once: the numbers from
 * services/wrapped plus the words around them (references, badge and
 * persona names, verse text where its license allows sharing).
 */
import { language, locale, t } from '@/i18n';
import {
  formatRange,
  formatRef,
  getPassage,
  getTranslation,
  getVerse,
  mayShareVerseText,
} from '@/services/bible';
import { badgeName, type BadgeCode } from '@/services/db/repos/badges';
import { loadYearRecap } from '@/services/db/repos/wrapped';
import { PERSONA_VERSES, type YearRecap } from '@/services/wrapped';

/** Longer passage text than this shows as its reference only: a card isn't a page. */
const PASSAGE_TEXT_MAX = 240;

export type RecapView = {
  recap: YearRecap;
  /** "In 2026" or "Since you started in October". */
  spanLabel: string;
  /** The small line above every card: "2026 · Year in the Word", or the first-season span. */
  kicker: string;
  passage: {
    reference: string;
    abbrev: string;
    /** Only when the translation may be shared and the text is short enough. */
    text: string | null;
  } | null;
  persona: {
    name: string;
    line: string;
    reference: string;
    /** WEB text for English; other languages show the reference. */
    text: string | null;
  } | null;
  badgeNames: string[];
};

export async function loadRecapView(year: number): Promise<RecapView> {
  const recap = await loadYearRecap(year);

  const spanLabel =
    recap.span.kind === 'firstSeason'
      ? t('wrapped:span.firstSeason', {
          month: new Date(year, recap.span.month - 1, 15).toLocaleDateString(locale(), {
            month: 'long',
          }),
        })
      : t('wrapped:span.year', { year });

  let passage: RecapView['passage'] = null;
  if (recap.passage) {
    const { translationId, range } = recap.passage;
    let text: string | null = null;
    if (mayShareVerseText(translationId)) {
      try {
        const joined = (await getPassage(translationId, range)).map((v) => v.text).join(' ');
        text = joined.length <= PASSAGE_TEXT_MAX ? joined : null;
      } catch {
        text = null;
      }
    }
    passage = {
      reference: formatRange(range),
      abbrev: abbrevOf(translationId),
      text,
    };
  }

  let persona: RecapView['persona'] = null;
  if (recap.persona) {
    const ref = PERSONA_VERSES[recap.persona];
    let text: string | null = null;
    if (language() === 'en') {
      try {
        text = (await getVerse('web', ref)).text;
      } catch {
        text = null;
      }
    }
    persona = {
      name: t(`wrapped:persona.${recap.persona}.name`),
      line: t(`wrapped:persona.${recap.persona}.line`),
      reference: text ? `${formatRef(ref)} WEB` : formatRef(ref),
      text,
    };
  }

  return {
    recap,
    spanLabel,
    kicker:
      recap.span.kind === 'firstSeason' ? spanLabel : `${year} · ${t('wrapped:title')}`,
    passage,
    persona,
    badgeNames: recap.badges.map((code) => badgeName(code as BadgeCode)),
  };
}

function abbrevOf(translationId: string): string {
  try {
    return getTranslation(translationId).abbrev;
  } catch {
    return '';
  }
}
