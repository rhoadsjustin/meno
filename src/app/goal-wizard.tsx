import { ModalSafeArea } from '@/components/modal-safe-area';
import { GoalWizard } from '@/features/goals/GoalWizard';

export default function GoalWizardRoute() {
  return (
    <ModalSafeArea>
      <GoalWizard />
    </ModalSafeArea>
  );
}
