/**
 * The Reader's text size, shared by the scrolling text and the book pose
 * and kept in the settings table. It starts at the default and takes the
 * stored size once that has been read; a failed read or write only means
 * the size is not remembered.
 */
import { create } from 'zustand';

import { clampTextSize, stepTextSize } from '@/features/reader/text-size';
import { readerTextSize, setReaderTextSize } from '@/services/db/repos/readerPrefs';
import { scriptureType } from '@/theme';

type ReaderPrefs = {
  textSize: number;
  /** Reads the stored size, once. */
  hydrate: () => void;
  /** One step smaller (-1) or larger (1). */
  step: (direction: 1 | -1) => void;
  reset: () => void;
};

let started = false;
let chosen = false;

export const useReaderPrefs = create<ReaderPrefs>((set, get) => {
  const choose = (textSize: number) => {
    // A choice made before the stored size arrives wins over it.
    chosen = true;
    if (textSize === get().textSize) return;
    set({ textSize });
    setReaderTextSize(textSize).catch(() => {});
  };
  return {
    textSize: scriptureType.defaultSize,
    hydrate: () => {
      if (started) return;
      started = true;
      readerTextSize()
        .then((stored) => {
          if (stored !== null && !chosen) set({ textSize: clampTextSize(stored, scriptureType) });
        })
        .catch(() => {});
    },
    step: (direction) => choose(stepTextSize(get().textSize, direction, scriptureType)),
    reset: () => choose(scriptureType.defaultSize),
  };
});
