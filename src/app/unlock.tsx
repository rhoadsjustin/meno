import { ModalSafeArea } from '@/components/modal-safe-area';
import { UnlockScreen } from '@/features/lock/UnlockScreen';

/**
 * The unlock quiz is a blocking full-screen task (`fullScreenModal` in the
 * root layout), so it appears over whatever is up, a sheet included. Its
 * insets are its own: a full-screen modal takes the root view out of the
 * window, and the root provider stops hearing about rotation and folds.
 */
export default function UnlockRoute() {
  return (
    <ModalSafeArea>
      <UnlockScreen />
    </ModalSafeArea>
  );
}
