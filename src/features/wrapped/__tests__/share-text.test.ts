import { describe, expect, it } from 'vitest';

import { recapShareText, recapStoreLink } from '@/features/wrapped/share-text';

describe('recap share text', () => {
  it('tags the store link with the provider token and the year', () => {
    const url = new URL(recapStoreLink(2026));
    expect(url.host).toBe('apps.apple.com');
    expect(url.pathname).toContain('id6806028621');
    expect(url.searchParams.get('pt')).toBe('118737961');
    expect(url.searchParams.get('ct')).toBe('wrapped2026');
    expect(url.searchParams.get('mt')).toBe('8');
  });

  it('puts the year and the unescaped link in one line', () => {
    const text = recapShareText(2026);
    expect(text).toContain('2026');
    expect(text).toContain(recapStoreLink(2026));
    expect(text).not.toContain('\n');
  });
});
