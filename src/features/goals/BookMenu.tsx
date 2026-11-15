import { Host, Picker } from '@expo/ui';
import type { ColorValue } from 'react-native';

import { bookName } from '@/services/bible';

export type BookMenuProps = {
  /** The books the translation has, in canonical order. */
  books: readonly { id: string; testament: 'ot' | 'nt' }[];
  bookId: string;
  onBookChange: (bookId: string) => void;
  tint?: ColorValue;
};

/**
 * The passage step's book menu (docs/07 §6). iOS groups the books under
 * Old Testament and New Testament (`BookMenu.ios.tsx`); the universal picker
 * has no sections, so elsewhere they run in canonical order, which already
 * puts the Old Testament first.
 */
export function BookMenu({ books, bookId, onBookChange, tint }: BookMenuProps) {
  return (
    <Host matchContents seedColor={tint}>
      <Picker selectedValue={bookId} onValueChange={(v) => onBookChange(String(v))}>
        {books.map((b) => (
          <Picker.Item key={b.id} label={bookName(b.id)} value={b.id} />
        ))}
      </Picker>
    </Host>
  );
}
