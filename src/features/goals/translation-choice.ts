/**
 * The translation picked on the picker screen, handed back to whichever
 * screen opened it (the goal wizard). A modal over a modal has no result
 * channel of its own, so this tiny store is it: the opener consumes and
 * clears the choice.
 */
import { create } from 'zustand';

type TranslationChoice = {
  choice: string | null;
  choose: (id: string) => void;
  clear: () => void;
};

export const useTranslationChoice = create<TranslationChoice>((set) => ({
  choice: null,
  choose: (id) => set({ choice: id }),
  clear: () => set({ choice: null }),
}));
