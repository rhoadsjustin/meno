import { describe, expect, it } from 'vitest';

import {
  challengeShareMessage,
  challengeTargetDate,
  ChallengeLinkError,
  encodeChallengeUrl,
  parseChallengeParams,
  parseChallengeUrl,
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
