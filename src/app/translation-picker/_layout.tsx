import { Stack } from 'expo-router';

import { ModalSafeArea } from '@/components/modal-safe-area';

/**
 * The translation picker's own stack inside its modal: all languages, then
 * one language's translations. Each screen configures its bar in-page.
 */
export default function TranslationPickerLayout() {
  return (
    <ModalSafeArea>
      <Stack />
    </ModalSafeArea>
  );
}
