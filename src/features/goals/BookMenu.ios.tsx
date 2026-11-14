import { Host, Picker, Section, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import type { BookMenuProps } from '@/features/goals/BookMenu';
import { useTranslation } from '@/i18n/react';
import { bookName } from '@/services/bible';

/**
 * The system menu picker with the books under their testament, so sixty-six
 * names read as two lists. A translation with one testament only (or a few
 * books of one) gets a plain list: a lone heading would say nothing.
 */
export function BookMenu({ books, bookId, onBookChange, tint }: BookMenuProps) {
  const { t } = useTranslation('goals');
  const old = books.filter((b) => b.testament === 'ot');
  const next = books.filter((b) => b.testament === 'nt');
  const options = (list: BookMenuProps['books']) =>
    list.map((b) => (
      <Text key={b.id} modifiers={[tag(b.id)]}>
        {bookName(b.id)}
      </Text>
    ));
  return (
    <Host matchContents seedColor={tint}>
      <Picker
        selection={bookId}
        onSelectionChange={(id) => onBookChange(String(id))}
        modifiers={[pickerStyle('menu')]}>
        {old.length > 0 && next.length > 0 ? (
          <>
            <Section title={t('picker.oldTestament')}>{options(old)}</Section>
            <Section title={t('picker.newTestament')}>{options(next)}</Section>
          </>
        ) : (
          options(books)
        )}
      </Picker>
    </Host>
  );
}
