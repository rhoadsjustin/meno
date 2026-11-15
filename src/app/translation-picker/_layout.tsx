import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { ModalSafeArea } from '@/components/modal-safe-area';
import {
  PICKER_VERSIONS_MAX_AGE,
  useTranslationCatalog,
} from '@/features/goals/translation-catalog';

/**
 * The translation picker's own stack inside its modal: all languages, then
 * one language's translations. Each screen configures its bar in-page.
 * Opening the picker, on either screen, quietly refreshes the version list
 * when it is more than a few minutes old.
 */
export default function TranslationPickerLayout() {
  const load = useTranslationCatalog((s) => s.load);
  const resetRefresh = useTranslationCatalog((s) => s.resetRefresh);

  useEffect(() => {
    void load({ versionsMaxAge: PICKER_VERSIONS_MAX_AGE });
    // What a check by hand found belongs to this visit, not the next one.
    return resetRefresh;
  }, [load, resetRefresh]);

  return (
    <ModalSafeArea>
      <Stack />
    </ModalSafeArea>
  );
}
