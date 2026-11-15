import { afterEach, describe, expect, it } from 'vitest';

import { applyLocale } from '@/i18n';

import {
  challengeShareContent,
  challengeShareMessage,
  challengeShareText,
  challengeTargetDate,
  ChallengeLinkError,
  encodeChallengeUrl,
  formatRangeIn,
  isPassageTitle,
  parseChallengeParams,
  parseChallengeUrl,
  targetDateStanding,
  toIsoDate,
  type Challenge,
} from '@/services/challenges/codec';

const phil: Challenge = {
  code: 'ABCD2345',
  translationId: 'web',
  range: {
    start: { bookId: 'Phil', chapter: 4, verse: 4 },
    end: { bookId: 'Phil', chapter: 4, verse: 9 },
  },
  title: 'Peace by Advent',
  targetDate: '2026-12-25',
};

describe('challenge codec', () => {
  it('round-trips through the URL', () => {
    expect(parseChallengeUrl(encodeChallengeUrl(phil))).toEqual(phil);
  });

  it('shares a universal link and still reads the old meno:// links', () => {
    const url = encodeChallengeUrl(phil);
    expect(url.startsWith('https://meno-scripture.org/challenge?v=1&')).toBe(true);
    const legacy = url.replace('https://meno-scripture.org/challenge', 'meno://challenge');
    expect(parseChallengeUrl(legacy)).toEqual(phil);
  });

  it('round-trips without a target date', () => {
    const { targetDate: _, ...rest } = phil;
    const dateless: Challenge = { ...rest };
    const decoded = parseChallengeUrl(encodeChallengeUrl(dateless));
    expect(decoded).toEqual(dateless);
    expect(decoded.targetDate).toBeUndefined();
  });

  it('survives URL-hostile titles', () => {
    const spicy: Challenge = { ...phil, title: 'Rejoice! 100% & more… 🙏' };
    expect(parseChallengeUrl(encodeChallengeUrl(spicy)).title).toBe(spicy.title);
  });

  it('accepts params in the useLocalSearchParams shape (arrays, uppercase code)', () => {
    const decoded = parseChallengeParams({
      v: '1',
      c: 'abcd2345',
      t: ['web'],
      s: 'Phil.4.4',
      e: 'Phil.4.9',
      n: 'Peace by Advent',
      d: '2026-12-25',
    });
    expect(decoded).toEqual(phil);
  });

  it('falls back to the formatted range when the title is empty', () => {
    const decoded = parseChallengeParams({ v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9', n: '  ' });
    expect(decoded.title).toBe('Philippians 4:4–9');
  });

  it('clamps absurdly long titles', () => {
    const decoded = parseChallengeParams({
      v: '1',
      c: 'ABCD2345',
      t: 'web',
      s: 'Phil.4.4',
      e: 'Phil.4.9',
      n: 'x'.repeat(500),
    });
    expect(decoded.title).toHaveLength(80);
  });

  it('drops invalid or impossible dates instead of failing the link', () => {
    for (const d of ['tomorrow', '2026-02-30', '2026-13-01', '26-12-25']) {
      const decoded = parseChallengeParams({ v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9', d });
      expect(decoded.targetDate).toBeUndefined();
    }
  });

  it('rejects links from a future format version with an upgrade message', () => {
    expect(() =>
      parseChallengeParams({ v: '2', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9' })
    ).toThrowError(/newer version of Meno/);
  });

  it('rejects missing or malformed essentials', () => {
    const good = { v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9' };
    expect(() => parseChallengeParams({ ...good, v: undefined })).toThrowError(ChallengeLinkError);
    expect(() => parseChallengeParams({ ...good, c: 'a!' })).toThrowError(ChallengeLinkError);
    expect(() => parseChallengeParams({ ...good, s: undefined })).toThrowError(ChallengeLinkError);
    expect(() => parseChallengeParams({ ...good, e: 'Phil.4' })).toThrowError(ChallengeLinkError);
  });

  it('rejects unknown translations, books, and out-of-canon chapters', () => {
    const good = { v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9' };
    expect(() => parseChallengeParams({ ...good, t: 'msg' })).toThrowError(/translation/);
    expect(() => parseChallengeParams({ ...good, s: 'Philly.4.4' })).toThrowError(ChallengeLinkError);
    expect(() => parseChallengeParams({ ...good, e: 'Phil.9.1' })).toThrowError(ChallengeLinkError);
  });

  it('rejects cross-book and inverted ranges', () => {
    const good = { v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9' };
    expect(() => parseChallengeParams({ ...good, e: 'Col.1.1' })).toThrowError(/multiple books/);
    expect(() => parseChallengeParams({ ...good, s: 'Phil.4.10' })).toThrowError(ChallengeLinkError);
  });

  it('builds a share message with references only — never verse text', () => {
    const message = challengeShareMessage(phil);
    expect(message).toContain('Philippians 4:4–9');
    expect(message).toContain('(WEB)');
    expect(message).toContain('“Peace by Advent”');
    expect(message).toContain(encodeChallengeUrl(phil));
    // The message must stay text-free: nothing verse-like beyond the reference.
    expect(message.toLowerCase()).not.toContain('rejoice in the lord');
  });

  it('hands iOS the link as its own item and keeps it in the text on Android', () => {
    const url = encodeChallengeUrl(phil);
    const ios = challengeShareContent(phil, 'ios');
    expect(ios.url).toBe(url);
    expect(ios.message).toBe(challengeShareText(phil));
    expect(ios.message).not.toContain('http');
    expect(ios.message).toContain('Philippians 4:4–9');
    expect(ios.message).toContain('“Peace by Advent”');
    expect(ios.message).toContain('December 25, 2026');

    const android = challengeShareContent(phil, 'android');
    expect(android.url).toBeUndefined();
    expect(android.message).toBe(challengeShareMessage(phil));
    expect(android.message).toContain(url);
  });

  it('says why a link failed, so the join screen can offer a next step', () => {
    const good = { v: '1', c: 'ABCD2345', t: 'web', s: 'Phil.4.4', e: 'Phil.4.9' };
    const reason = (params: Record<string, string>) => {
      try {
        parseChallengeParams(params);
      } catch (err) {
        return err instanceof ChallengeLinkError ? err.reason : 'not a link error';
      }
      return 'parsed';
    };
    expect(reason(good)).toBe('parsed');
    expect(reason({ ...good, v: '2' })).toBe('newerVersion');
    expect(reason({ ...good, v: '0' })).toBe('malformed');
    expect(reason({ ...good, t: 'msg' })).toBe('unknownTranslation');
    expect(reason({ ...good, e: 'Phil.9.1' })).toBe('passageNotFound');
    expect(reason({ ...good, e: 'Col.1.1' })).toBe('multipleBooks');
  });

  it('classifies a target date against today and the day estimate', () => {
    expect(targetDateStanding(undefined, '2026-12-01', 5)).toBe('none');
    // Last year's link: the date is behind us.
    expect(targetDateStanding('2025-12-25', '2026-12-01', 5)).toBe('past');
    expect(targetDateStanding('2026-11-30', '2026-12-01', 5)).toBe('past');
    // Due today is not past, but nothing fits before it.
    expect(targetDateStanding('2026-12-01', '2026-12-01', 5)).toBe('tight');
    expect(targetDateStanding('2026-12-25', '2026-12-21', 5)).toBe('tight');
    // Exactly enough days, across a month and a year boundary.
    expect(targetDateStanding('2026-12-25', '2026-12-20', 5)).toBe('reachable');
    expect(targetDateStanding('2027-01-02', '2026-12-28', 5)).toBe('reachable');
    expect(targetDateStanding('2027-01-02', '2026-12-29', 5)).toBe('tight');
    // Across a daylight-saving change the count is still whole days.
    expect(targetDateStanding('2026-03-10', '2026-03-05', 5)).toBe('reachable');
  });

  it('omits the quoted name when the title is just the passage', () => {
    const untitled: Challenge = { ...phil, title: 'Philippians 4:4–9' };
    expect(challengeShareMessage(untitled)).not.toContain('“');
  });

  it('converts target dates in local time without off-by-one', () => {
    const date = challengeTargetDate(phil);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(11);
    expect(date?.getDate()).toBe(25);
    expect(toIsoDate(date!)).toBe('2026-12-25');
    expect(challengeTargetDate({ ...phil, targetDate: undefined })).toBeUndefined();
  });
});

describe('language-neutral links', () => {
  afterEach(() => applyLocale(['en-US']));

  it('leaves a reference-only title off the link, so it reads in the receiver’s language', () => {
    const untitled: Challenge = { ...phil, title: 'Philippians 4:4–9' };
    const url = encodeChallengeUrl(untitled);
    expect(url).not.toContain('n=');
    expect(url).toContain('s=Phil.4.4');
    applyLocale(['es-MX']);
    expect(parseChallengeUrl(url).title).toBe('Filipenses 4:4–9');
  });

  it('recognizes a reference title made in any UI language', () => {
    const range = phil.range;
    expect(formatRangeIn(range, 'en')).toBe('Philippians 4:4–9');
    expect(formatRangeIn(range, 'es')).toBe('Filipenses 4:4–9');
    expect(isPassageTitle('Filipenses 4:4–9', range)).toBe(true);
    expect(isPassageTitle('Philippians 4:4–9', range)).toBe(true);
    expect(isPassageTitle('  ', range)).toBe(true);
    expect(isPassageTitle('Peace by Advent', range)).toBe(false);
    applyLocale(['es-MX']);
    expect(isPassageTitle('Philippians 4:4–9', range)).toBe(true);
    expect(encodeChallengeUrl({ ...phil, title: 'Filipenses 4:4–9' })).not.toContain('n=');
  });

  it('writes the share message in the UI language with a localized date', () => {
    applyLocale(['es-MX']);
    const message = challengeShareMessage(phil);
    expect(message).toContain('“Peace by Advent”');
    expect(message).toContain('Filipenses 4:4–9 (WEB)');
    expect(message).toContain('25 de diciembre de 2026');
    expect(message).toContain(encodeChallengeUrl(phil));
  });
});
