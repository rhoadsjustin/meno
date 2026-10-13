import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadReminderStatus,
  onRemindersChanged,
  type ReminderStatus,
} from '@/services/notifications';

/**
 * Live reminder status for a screen: read when the screen gains focus and
 * again whenever the switch, the time or the schedule changes anywhere in
 * the app (the root layout reschedules on every foreground, so coming back
 * from iPhone Settings counts). `null` until the first read lands.
 */
export function useReminderStatus(): ReminderStatus | null {
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  // Only the latest read may land; an older one can finish after it.
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const run = ++latest.current;
    try {
      const next = await loadReminderStatus();
      if (run === latest.current) setStatus(next);
    } catch {
      // Keep the last known status.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const unsubscribe = onRemindersChanged(() => void refresh());
    return unsubscribe;
  }, [refresh]);

  return status;
}
