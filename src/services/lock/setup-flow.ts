/**
 * Lock setup as pure decisions (docs/04 §1, §5): the order of the steps, and
 * what turning a mode on does to the schedules and shields of the mode that
 * was running before. The Screen Time calls themselves are passed in, so the
 * order is unit-tested without the native module.
 */

export type LockMode = 'firstPickup' | 'everyPickup' | 'schedule';

export type SetupStep = 'explainer' | 'authorize' | 'pick' | 'configure' | 'done';

/**
 * The step an in-screen Back returns to, or `null` where there is none.
 * Leaving setup is the bar's back button.
 *
 * `authorize` is shown only after Apple's permission request was declined
 * (the explainer's Continue opens the request itself). It has no Back: the
 * explainer is the message before that request and must lead to it (App
 * Review 5.1.1(iv)), so nothing returns to it while permission is not given.
 * Choosing apps comes after the grant, so from there Back is the explainer.
 */
export function previousStep(step: SetupStep): SetupStep | null {
  switch (step) {
    case 'pick':
      return 'explainer';
    case 'configure':
      return 'pick';
    case 'explainer':
    case 'authorize':
    case 'done':
      return null;
  }
}

/** The minutes "Every pickup" offers before shields return (04 §1). */
export const RELOCK_CHOICES = [15, 30, 60] as const;
export const DEFAULT_RELOCK_MINUTES = 30;

/** A stored interval, or the default when it is not one of the choices. */
export function relockChoice(minutes: number | null | undefined): number {
  return RELOCK_CHOICES.find((m) => m === minutes) ?? DEFAULT_RELOCK_MINUTES;
}

/** v1: one evening window. */
export const SCHEDULE_WINDOW = { startHour: 21, endHour: 23 } as const;

/** The Screen Time operations a mode switch is made of (src/services/lock). */
export type LockModeOps = {
  /** Stops every schedule the lock owns; shields stay as they are. */
  stopSchedules: () => void;
  armShields: () => void;
  clearShields: () => void;
  /** Starts the daily re-arm and arms the shields now. */
  startFirstPickup: () => Promise<void>;
  /** Starts the window and arms the shields only if it is open now. */
  startSchedule: (startHour: number, endHour: number) => Promise<void>;
};

/**
 * Turns `mode` on in place of whatever ran before. The previous mode's
 * schedules are stopped first, so a midnight re-arm or a pending re-lock
 * cannot put shields up outside the mode the user just chose.
 */
export async function switchLockMode(ops: LockModeOps, mode: LockMode): Promise<void> {
  ops.stopSchedules();
  switch (mode) {
    case 'firstPickup':
      await ops.startFirstPickup();
      return;
    case 'everyPickup':
      ops.armShields();
      return;
    case 'schedule':
      // Shields left up by the previous mode come down; the window puts
      // them back if it is open now, and at its start otherwise.
      ops.clearShields();
      await ops.startSchedule(SCHEDULE_WINDOW.startHour, SCHEDULE_WINDOW.endHour);
      return;
  }
}
