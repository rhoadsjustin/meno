import { Host, Picker } from '@expo/ui';
import type { ColorValue } from 'react-native';

export type ExtendMenuProps = {
  /** Later chapters of the book the passage can run through. */
  chapters: number[];
  onExtend: (chapter: number) => void;
  tint?: ColorValue;
};

/**
 * Runs the passage through the end of a later chapter — how whole books get
 * chosen without a second set of pickers. iOS renders a system menu of
 * actions (`ExtendMenu.ios.tsx`); elsewhere the platform dropdown stands in.
 */
export function ExtendMenu({ chapters, onExtend, tint }: ExtendMenuProps) {
  return (
    <Host matchContents seedColor={tint}>
      <Picker
        selectedValue={0}
        onValueChange={(c) => {
          if (c > 0) onExtend(c);
        }}>
        <Picker.Item label="Extend through" value={0} />
        {chapters.map((c) => (
          <Picker.Item key={c} label={`Chapter ${c}`} value={c} />
        ))}
      </Picker>
    </Host>
  );
}
