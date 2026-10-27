import { Button, Host, Menu } from '@expo/ui/swift-ui';

import type { ExtendMenuProps } from '@/features/goals/ExtendMenu';
import { useTranslation } from '@/i18n/react';

/** The system menu: one action per later chapter of the book. */
export function ExtendMenu({ chapters, onExtend, tint }: ExtendMenuProps) {
  const { t } = useTranslation('goals');
  return (
    <Host matchContents seedColor={tint}>
      <Menu label={t('passage.extendThrough')}>
        {chapters.map((c) => (
          <Button key={c} label={t('passage.chapter', { chapter: c })} onPress={() => onExtend(c)} />
        ))}
      </Menu>
    </Host>
  );
}
