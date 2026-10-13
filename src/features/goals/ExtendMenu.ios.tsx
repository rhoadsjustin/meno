import { Button, Host, Menu } from '@expo/ui/swift-ui';

import type { ExtendMenuProps } from '@/features/goals/ExtendMenu';

/** The system menu: one action per later chapter of the book. */
export function ExtendMenu({ chapters, onExtend, tint }: ExtendMenuProps) {
  return (
    <Host matchContents seedColor={tint}>
      <Menu label="Extend through">
        {chapters.map((c) => (
          <Button key={c} label={`Chapter ${c}`} onPress={() => onExtend(c)} />
        ))}
      </Menu>
    </Host>
  );
}
