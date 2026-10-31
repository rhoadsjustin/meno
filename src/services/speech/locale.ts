/**
 * Which speech-recognizer locale hears a verse (docs/02-architecture.md §7).
 * Pure TypeScript — no React Native imports.
 *
 * Translations carry the Platform's language ids ('de', 'es', 'zh-Hant-TW',
 * 'hi-Latn'), but recognizers are regional ('de-DE', 'es-MX', 'zh-TW') and
 * iOS accepts only an exact one. The recognizer follows the verse text's
 * language, the device's own region for that language when there is one
 * (a Mexican user's accent, whatever region the translation came from), and
 * never a different script: a recognizer writes its language's usual
 * script, so romanized Hindi or Latin-script Serbian can't be graded from it.
 */

type Tag = { lang: string; script: string | null; region: string | null };

/** Retired or macro codes recognizers list under another id. */
const LANGUAGE_ALIASES: Record<string, string> = { no: 'nb', iw: 'he', in: 'id', ji: 'yi' };

/**
 * The script a language's recognizer writes. A text tagged with another
 * script gets no recognizer. Languages missing here accept only untagged text.
 */
const RECOGNIZER_SCRIPT: Record<string, string> = {
  ar: 'Arab',
  bg: 'Cyrl',
  bn: 'Beng',
  el: 'Grek',
  gu: 'Gujr',
  he: 'Hebr',
  hi: 'Deva',
  ja: 'Jpan',
  kn: 'Knda',
  ko: 'Kore',
  ml: 'Mlym',
  mr: 'Deva',
  ne: 'Deva',
  or: 'Orya',
  pa: 'Guru',
  ru: 'Cyrl',
  sr: 'Cyrl',
  ta: 'Taml',
  te: 'Telu',
  th: 'Thai',
  uk: 'Cyrl',
  ur: 'Arab',
};

/** Chinese regions by the script their recognizer writes. */
const CHINESE_REGIONS: Record<'Hans' | 'Hant', string[]> = {
  Hans: ['CN', 'SG'],
  Hant: ['TW', 'HK', 'MO'],
};

/** Region to fall back on when neither the device nor the text names one. */
const DEFAULT_REGION: Record<string, string> = {
  ar: 'SA',
  ca: 'ES',
  cs: 'CZ',
  da: 'DK',
  el: 'GR',
  en: 'US',
  // The Platform's bare 'es' is Latin American Spanish (catalog.ts).
  es: 'MX',
  he: 'IL',
  hi: 'IN',
  ja: 'JP',
  ko: 'KR',
  ms: 'MY',
  nb: 'NO',
  pt: 'BR',
  sv: 'SE',
  uk: 'UA',
  vi: 'VN',
};

function parse(tag: string): Tag | null {
  const parts = tag.replace(/_/g, '-').split('-').filter(Boolean);
  if (parts.length === 0) return null;
  const raw = parts[0].toLowerCase();
  const lang = LANGUAGE_ALIASES[raw] ?? raw;
  let script: string | null = null;
  let region: string | null = null;
  for (const p of parts.slice(1)) {
    if (/^[A-Za-z]{4}$/.test(p)) script = p[0].toUpperCase() + p.slice(1).toLowerCase();
    else if (/^([A-Za-z]{2}|\d{3})$/.test(p)) region = p.toUpperCase();
  }
  return { lang, script, region };
}

function chineseScript(t: Tag): 'Hans' | 'Hant' | null {
  if (t.script === 'Hans' || t.script === 'Hant') return t.script;
  if (t.script) return null;
  return t.region && CHINESE_REGIONS.Hant.includes(t.region) ? 'Hant' : 'Hans';
}

/** Does this recognizer locale write what the text is written in? */
function compatible(text: Tag, recognizer: Tag): boolean {
  if (recognizer.lang !== text.lang) return false;
  if (text.lang === 'zh') return chineseScript(text) === chineseScript(recognizer);
  if (!text.script) return true;
  return RECOGNIZER_SCRIPT[text.lang] === text.script;
}

/** Latin American Spanish (es-419) is every Spanish region but Spain. */
function regionMatches(textRegion: string, region: string | null): boolean {
  if (textRegion === '419') return region !== null && region !== 'ES';
  return region === textRegion;
}

/**
 * The recognizer locale for a translation's `languageCode`, chosen from the
 * locales this device's recognizer supports; null when none can hear it.
 *
 * Order: the device's own locale for the language (first preference wins),
 * the text's region, the language's usual region, then any — alphabetical,
 * so the choice is stable.
 */
export function recognizerLocale(
  languageCode: string,
  supported: readonly string[],
  deviceTags: readonly string[] = [],
): string | null {
  const text = parse(languageCode);
  if (!text) return null;
  const candidates = supported
    .map((id) => ({ id: id.replace(/_/g, '-'), tag: parse(id) }))
    .filter((c): c is { id: string; tag: Tag } => c.tag !== null && compatible(text, c.tag))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (candidates.length === 0) return null;

  for (const device of deviceTags) {
    const d = parse(device);
    if (!d || d.lang !== text.lang || !d.region) continue;
    const hit = candidates.find((c) => c.tag.region === d.region);
    if (hit) return hit.id;
  }
  if (text.region) {
    const region = text.region;
    const usual = DEFAULT_REGION[text.lang];
    const hit =
      // A region group (es-419) takes the language's usual region inside it first.
      candidates.find((c) => c.tag.region === usual && regionMatches(region, usual)) ??
      candidates.find((c) => regionMatches(region, c.tag.region));
    if (hit) return hit.id;
  }
  if (text.lang === 'zh') {
    const regions = CHINESE_REGIONS[chineseScript(text) ?? 'Hans'];
    for (const r of regions) {
      const hit = candidates.find((c) => c.tag.region === r);
      if (hit) return hit.id;
    }
  }
  const usual = DEFAULT_REGION[text.lang] ?? text.lang.toUpperCase();
  return (candidates.find((c) => c.tag.region === usual) ?? candidates[0]).id;
}

/**
 * A best guess when the recognizer can't list its locales in time: the
 * device's region for the language, else the text's, else the usual one,
 * with the same script rule. The recognizer itself still has the last word
 * (it refuses a locale it can't hear on the device).
 */
export function fallbackLocale(
  languageCode: string,
  deviceTags: readonly string[] = [],
): string | null {
  const text = parse(languageCode);
  if (!text) return null;
  const guesses: string[] = [];
  for (const device of deviceTags) {
    const d = parse(device);
    if (d && d.lang === text.lang && d.region) guesses.push(`${text.lang}-${d.region}`);
  }
  if (text.lang === 'zh') {
    guesses.push(...CHINESE_REGIONS[chineseScript(text) ?? 'Hans'].map((r) => `zh-${r}`));
  } else {
    if (text.region && text.region !== '419') guesses.push(`${text.lang}-${text.region}`);
    guesses.push(`${text.lang}-${DEFAULT_REGION[text.lang] ?? text.lang.toUpperCase()}`);
  }
  return recognizerLocale(languageCode, guesses, deviceTags);
}
