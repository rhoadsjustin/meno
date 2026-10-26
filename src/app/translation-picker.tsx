import { ModalSafeArea } from '@/components/modal-safe-area';
import { TranslationPicker } from '@/features/goals/TranslationPicker';

export default function TranslationPickerRoute() {
  return (
    <ModalSafeArea>
      <TranslationPicker />
    </ModalSafeArea>
  );
}
