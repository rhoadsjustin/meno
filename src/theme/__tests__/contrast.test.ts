import { describe, expect, it } from 'vitest';

import { palette, type ColorScheme } from '@/theme/palette';

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2 contrast ratio between two `#RRGGBB` colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const schemes: ColorScheme[] = ['light', 'dark'];

// docs/07 §3: all text pairs ≥ 4.5:1. These are the pairs the shared
// buttons (src/components/button.tsx, text-link.tsx) put on screen.
describe('button colour pairs', () => {
  it.each(schemes)('%s: filled label on lapis', (scheme) => {
    const c = palette[scheme];
    expect(contrast(c.onLapis, c.lapis)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(schemes)('%s: filled destructive label on error', (scheme) => {
    const c = palette[scheme];
    expect(contrast(c.onLapis, c.error)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(schemes)('%s: plain and link labels on both surfaces', (scheme) => {
    const c = palette[scheme];
    for (const surface of [c.surface, c.surfaceRaised]) {
      expect(contrast(c.lapis, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.error, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.ink, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(schemes)('%s: tinted label on lapisWash', (scheme) => {
    const c = palette[scheme];
    expect(contrast(c.ink, c.lapisWash)).toBeGreaterThanOrEqual(4.5);
  });
});
