import { useEffect, useState } from 'react';

import { availableChapters, getBook } from '@/services/bible';

/**
 * The chapters a translation has of a book, for chapter menus and next /
 * previous. Until a portion's list arrives it answers with the canon's
 * chapters and `ready: false`, so callers can wait before correcting a
 * chapter the translation turns out not to have.
 */
export function useAvailableChapters(
  translationId: string | null | undefined,
  bookId: string,
): { chapters: number[]; ready: boolean } {
  const key = `${translationId ?? ''}.${bookId}`;
  const [loaded, setLoaded] = useState<{ key: string; chapters: number[] } | null>(null);

  useEffect(() => {
    if (!translationId) return;
    let live = true;
    void availableChapters(translationId, bookId).then((chapters) => {
      if (live) setLoaded({ key, chapters });
    });
    return () => {
      live = false;
    };
  }, [translationId, bookId, key]);

  if (loaded?.key === key) return { chapters: loaded.chapters, ready: true };
  const all = Array.from({ length: getBook(bookId).chapters }, (_, i) => i + 1);
  return { chapters: all, ready: !translationId };
}
