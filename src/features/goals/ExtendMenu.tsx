import { MenuView, type MenuComponentRef } from '@expo/ui/community/menu';
import { useRef } from 'react';
import type { ColorValue } from 'react-native';

import { TextLink } from '@/components/text-link';
import { useTranslation } from '@/i18n/react';

export type ExtendMenuProps = {
  /** Later chapters of the book the passage can run through. */
  chapters: number[];
  onExtend: (chapter: number) => void;
  tint?: ColorValue;
};

/**
 * Runs the passage through the end of a later chapter — how whole books get
 * chosen without a second set of pickers. iOS renders a system menu of
 * actions (`ExtendMenu.ios.tsx`); elsewhere a Material dropdown of the same
 * actions opens from a link. A menu, not a picker: each row acts, and
 * nothing stays selected.
 */
export function ExtendMenu({ chapters, onExtend }: ExtendMenuProps) {
  const { t } = useTranslation('goals');
  const menu = useRef<MenuComponentRef>(null);
  return (
    <MenuView
      ref={menu}
      actions={chapters.map((c) => ({
        id: String(c),
        title: t('passage.chapter', { chapter: c }),
      }))}
      onPressAction={(e) => {
        const chapter = Number(e.nativeEvent.event);
        if (chapters.includes(chapter)) onExtend(chapter);
      }}>
      <TextLink label={t('passage.extendThrough')} onPress={() => menu.current?.show()} />
    </MenuView>
  );
}
