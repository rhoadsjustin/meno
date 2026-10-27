import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attributionLine,
  buildQuery,
  decodeEntities,
  fetchBible,
  fetchBibles,
  fetchLanguages,
  fetchYouVersionChapter,
  parsePassageHtml,
  toTranslation,
  YouVersionError,
  youversionKeyConfigured,
  type YvBible,
} from '@/services/bible/youversion';

const at = { translationId: 'yv-111', bookId: 'John', chapter: 3 };

describe('parsePassageHtml', () => {
  it('reads the Platform markup: markers, labels, headings, notes, small caps', () => {
    const html = `
      <div>
        <div class="s1 yv-h">Introduction to the Sermon on the Mount</div>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Now when Jesus saw the crowds, he went up on a mountainside and sat down.
          <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>His disciples came to him,<span class="yv-n f"><span class="fr">2 </span><span class="ft">Some manuscripts omit this.</span></span> and he began to teach them.
        </div>
        <div class="s1 yv-h">The Beatitudes</div>
        <div class="m">He said:</div>
        <div class="q1">
          <span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>&ldquo;Blessed are the poor in spirit,
        </div>
        <div class="q2">for theirs is the kingdom of heaven.</div>
        <div class="q1"><span class="yv-v" v="4"></span><span class="yv-vlbl">4</span>Praise the <span class="nd">Lord</span>,&nbsp;all you nations;<span class="yv-n x">(Ps 117:1)</span></div>
      </div>`;
    expect(parsePassageHtml(html, at)).toEqual([
      {
        ...at,
        verse: 1,
        text: 'Now when Jesus saw the crowds, he went up on a mountainside and sat down.',
      },
      { ...at, verse: 2, text: 'His disciples came to him, and he began to teach them. He said:' },
      {
        ...at,
        verse: 3,
        text: '“Blessed are the poor in spirit, for theirs is the kingdom of heaven.',
      },
      { ...at, verse: 4, text: 'Praise the Lord, all you nations;' },
    ]);
  });

  it('gives a lead-in paragraph to the verse whose marker precedes it', () => {
    // Text between verse 2's marker and verse 3's marker is verse 2's,
    // including a lead-in line in its own paragraph.
    const html = `<div class="p"><span class="yv-v" v="2"></span>Then<span class="yv-vlbl">2</span></div><div class="m">he said:</div><div class="q1"><span class="yv-v" v="3"></span>Blessed.</div>`;
    expect(parsePassageHtml(html, at).map((v) => v.text)).toEqual(['Then he said:', 'Blessed.']);
  });

  it('accepts the Bible App wrapper markup and bridged verses', () => {
    const html = `
      <div class="p">
        <span class="verse v16" data-usfm="JHN.3.16"><span class="label">16</span><span class="content">For God so loved the world</span></span>
        <span class="verse v17-18" data-usfm="JHN.3.17"><span class="label">17-18</span><span class="content">that he gave his only Son.</span></span>
      </div>
      <div class="p"><span class="yv-v" v="19-20"></span>This is the verdict.</div>`;
    expect(parsePassageHtml(html, at).map((v) => [v.verse, v.text])).toEqual([
      [16, 'For God so loved the world'],
      [17, 'that he gave his only Son.'],
      [19, 'This is the verdict.'],
    ]);
  });

  it('drops text before the first marker, superscriptions, and verses left empty', () => {
    const html = `<div class="d">A Psalm of David.</div><div class="q1"><span class="yv-v" v="1"></span><span class="yv-n f">note only</span></div><div class="q1"><span class="yv-v" v="2"></span>The Lord is my shepherd.</div>`;
    expect(parsePassageHtml(html, at).map((v) => [v.verse, v.text])).toEqual([
      [2, 'The Lord is my shepherd.'],
    ]);
  });

  it('decodes entities and collapses whitespace', () => {
    expect(decodeEntities('&amp; &lt;b&gt; &#8220;hi&#x201D; &nbsp;&unknown;')).toBe(
      '& <b> “hi” \u00a0&unknown;',
    );
    const html = `<div class="p"><span class="yv-v" v="1"/>   Many\n\twords&nbsp;here  <br/>and   there.</div>`;
    expect(parsePassageHtml(html, at)[0].text).toBe('Many words here and there.');
  });

  it('returns nothing for markup without verse markers', () => {
    expect(parsePassageHtml('<div class="p">Just prose.</div>', at)).toEqual([]);
  });
});

describe('toTranslation', () => {
  const base: YvBible = {
    id: 206,
    abbreviation: 'engWEBUS',
    localized_abbreviation: 'WEBUS',
    title: "World English Bible, American English Edition, without Strong's Numbers",
    localized_title: 'World English Bible (US)',
    language_tag: 'en',
    copyright: 'PUBLIC DOMAIN (not copyrighted)',
    promotional_content: 'This Public Domain Bible text is courtesy of eBible.org.',
    books: ['GEN', 'EXO', 'MAT', 'JHN', 'TOB', '1CO'],
    text_direction: 'ltr',
  };

  it('prefers localized names, maps USFM books to OSIS in canon order, and is ephemeral', () => {
    const t = toTranslation(base);
    expect(t.id).toBe('yv-206');
    expect(t.abbrev).toBe('WEBUS');
    expect(t.name).toBe('World English Bible (US)');
    expect(t.languageCode).toBe('en');
    expect(t.licenseType).toBe('api_ephemeral');
    expect(t.source).toBe('youversion');
    expect(t.isDownloaded).toBe(false);
    expect(t.books).toEqual(['Gen', 'Exod', 'Matt', 'John', '1Cor']);
    expect(t.attribution).toBe('PUBLIC DOMAIN (not copyrighted).');
    expect(t.textDirection).toBe('ltr');
  });

  it('omits the book list for a complete canon and reads rtl', () => {
    const all = [
      'GEN',
      'EXO',
      'LEV',
      'NUM',
      'DEU',
      'JOS',
      'JDG',
      'RUT',
      '1SA',
      '2SA',
      '1KI',
      '2KI',
      '1CH',
      '2CH',
      'EZR',
      'NEH',
      'EST',
      'JOB',
      'PSA',
      'PRO',
      'ECC',
      'SNG',
      'ISA',
      'JER',
      'LAM',
      'EZK',
      'DAN',
      'HOS',
      'JOL',
      'AMO',
      'OBA',
      'JON',
      'MIC',
      'NAM',
      'HAB',
      'ZEP',
      'HAG',
      'ZEC',
      'MAL',
      'MAT',
      'MRK',
      'LUK',
      'JHN',
      'ACT',
      'ROM',
      '1CO',
      '2CO',
      'GAL',
      'EPH',
      'PHP',
      'COL',
      '1TH',
      '2TH',
      '1TI',
      '2TI',
      'TIT',
      'PHM',
      'HEB',
      'JAS',
      '1PE',
      '2PE',
      '1JN',
      '2JN',
      '3JN',
      'JUD',
      'REV',
      'TOB',
      'SIR',
    ];
    const t = toTranslation({
      ...base,
      books: all,
      text_direction: 'rtl',
      localized_abbreviation: null,
      localized_title: null,
    });
    expect(t.books).toBeUndefined();
    expect(t.textDirection).toBe('rtl');
    expect(t.abbrev).toBe('engWEBUS');
    expect(t.name).toBe(base.title);
  });

  it('falls back from copyright to promotional text to the name for attribution', () => {
    expect(attributionLine('Free Bible', '© 2020 Publisher. All rights reserved.', 'promo')).toBe(
      '© 2020 Publisher. All rights reserved.',
    );
    expect(attributionLine('Free Bible', '', 'Courtesy of eBible.org')).toBe(
      'Courtesy of eBible.org.',
    );
    expect(attributionLine('Free Bible', null, undefined)).toBe('Free Bible.');
  });
});

describe('requests', () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const json = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      ...init,
    });

  beforeEach(() => {
    calls.length = 0;
    vi.stubEnv('EXPO_PUBLIC_YOUVERSION_APP_KEY', 'test-key');
  });
  afterEach(() => vi.unstubAllEnvs());

  const fake = (responder: (url: string) => Response): typeof fetch =>
    (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        headers: Object.fromEntries(
          Object.entries((init?.headers as Record<string, string>) ?? {}),
        ),
      });
      return responder(url);
    }) as typeof fetch;

  it('knows when the key is configured', () => {
    expect(youversionKeyConfigured()).toBe(true);
    vi.stubEnv('EXPO_PUBLIC_YOUVERSION_APP_KEY', '');
    expect(youversionKeyConfigured()).toBe(false);
  });

  it('builds repeated-key queries', () => {
    expect(buildQuery({ 'language_ranges[]': ['en', 'es'], page_size: '99' })).toBe(
      'language_ranges%5B%5D=en&language_ranges%5B%5D=es&page_size=99',
    );
  });

  it('sends the app key, filters bibles by one language, and follows pages', async () => {
    const fetchImpl = fake((url) =>
      url.includes('page_token=p2')
        ? json({
            data: [{ id: 2, abbreviation: 'B', title: 'Second', language_tag: 'es' }],
            next_page_token: null,
          })
        : json({
            data: [{ id: 1, abbreviation: 'A', title: 'First', language_tag: 'es' }],
            next_page_token: 'p2',
          }),
    );
    const list = await fetchBibles('es', fetchImpl, 'es-MX');
    expect(list.map((t) => t.id)).toEqual(['yv-1', 'yv-2']);
    expect(calls[0].url).toBe(
      'https://api.youversion.com/v1/bibles?language_ranges%5B%5D=es&page_size=99',
    );
    expect(calls[0].headers['X-YVP-App-Key']).toBe('test-key');
    expect(calls[0].headers['Accept-Language']).toBe('es-MX');
    expect(calls[1].url).toContain('page_token=p2');
  });

  it('asks for all languages at once, paging only if the server refuses', async () => {
    const one = fake(() =>
      json({
        data: [
          { id: 'es', localized_name: 'Spanish', text_direction: 'ltr' },
          { id: 'ar', text_direction: 'rtl' },
        ],
      }),
    );
    expect(await fetchLanguages('en-US', one)).toEqual([
      { id: 'es', name: 'Spanish', textDirection: 'ltr' },
      { id: 'ar', name: 'ar', textDirection: 'rtl' },
    ]);
    expect(calls[0].url).toBe(
      'https://api.youversion.com/v1/languages?bibles_available=true&page_size=*&fields%5B%5D=id&fields%5B%5D=localized_name&fields%5B%5D=text_direction',
    );
    expect(calls[0].headers['Accept-Language']).toBe('en-US');

    calls.length = 0;
    const paged = fake((url) =>
      url.includes('page_size=*')
        ? new Response('{"detail":[{"loc":["page_size"]}]}', { status: 422 })
        : json({ data: [{ id: 'fr', localized_name: 'French' }], next_page_token: null }),
    );
    expect(await fetchLanguages('en', paged)).toEqual([
      { id: 'fr', name: 'French', textDirection: 'ltr' },
    ]);
    expect(calls[1].url).toContain('page_size=99');
  });

  it('fetches a chapter by USFM id and parses it', async () => {
    const fetchImpl = fake(() =>
      json({
        id: 'JHN.3',
        content:
          '<div class="p"><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>For God so loved the world.</div>',
      }),
    );
    const verses = await fetchYouVersionChapter('yv-111', 111, 'John', 3, fetchImpl);
    expect(calls[0].url).toBe(
      'https://api.youversion.com/v1/bibles/111/passages/JHN.3?format=html',
    );
    expect(verses).toEqual([
      {
        translationId: 'yv-111',
        bookId: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world.',
      },
    ]);
  });

  it('reads an empty reply as a language with nothing to offer', async () => {
    // The live catalog answers 204 No Content for a language this key has
    // no version in; Hermes used to surface that as a JSON parse error.
    const noContent = fake(() => new Response(null, { status: 204 }));
    await expect(fetchBibles('zu', noContent)).resolves.toEqual([]);
    await expect(fetchLanguages('en', noContent)).resolves.toEqual([]);
    await expect(fetchBible(12, noContent)).rejects.toMatchObject({ status: 404 });
    await expect(fetchYouVersionChapter('yv-12', 12, 'John', 3, noContent)).rejects.toThrow(
      /No verse text/,
    );
  });

  it('names an unreadable reply instead of leaking the parser', async () => {
    await expect(
      fetchBibles(
        'en',
        fake(() => new Response('<html>Service busy</html>', { status: 200 })),
      ),
    ).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining('Unreadable reply'),
    } satisfies Partial<YouVersionError>);
  });

  it('explains failures in plain words, including rate limits and licensing', async () => {
    await expect(
      fetchYouVersionChapter(
        'yv-1',
        1,
        'John',
        3,
        fake(
          () =>
            new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': '30' } }),
        ),
      ),
    ).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('30s'),
    } satisfies Partial<YouVersionError>);
    await expect(
      fetchBibles(
        'en',
        fake(() => new Response('', { status: 403 })),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      fetchBibles(
        'en',
        fake(() => json({ content: '<p>no markers</p>' })),
      ),
    ).resolves.toEqual([]);
    await expect(
      fetchYouVersionChapter(
        'yv-1',
        1,
        'John',
        3,
        fake(() => json({ content: '<p>no markers</p>' })),
      ),
    ).rejects.toThrow(/No verse text/);
    vi.stubEnv('EXPO_PUBLIC_YOUVERSION_APP_KEY', '');
    await expect(
      fetchBibles(
        'en',
        fake(() => json({ data: [] })),
      ),
    ).rejects.toThrow(/not configured/);
  });
});
