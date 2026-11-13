/**
 * The quick start, once: a starter verse becomes the first passage and the
 * caller opens practice on it. Shared by Today's starter deck and the last
 * onboarding step, so both give the same haptic, the same "Starting…" state
 * and the same message when it fails.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import { announce } from '@/components/screen-reader';
import { useTranslation } from '@/i18n/react';
import type { StarterVerse } from '@/services/bible';
import { startStarterGoal, type Goal } from '@/services/db/repos/goals';

export function useStartStarter(
  /** Where to go with the new passage; awaited, so the busy state covers it. */
  onStarted: (goal: Goal) => void | Promise<void>,
) {
  const { t } = useTranslation('today');
  // One tap, one passage: the ref blocks a second tap before React has
  // re-rendered the disabled buttons (and `startStarterGoal` dedupes too).
  const busy = useRef(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const start = useCallback(
    async (starter: StarterVerse, options?: { preferEsv?: boolean }) => {
      if (busy.current) return;
      busy.current = true;
      setStartingId(starter.id);
      setFailed(false);
      void Haptics.selectionAsync();
      try {
        await onStarted(await startStarterGoal(starter, options));
      } catch {
        setFailed(true);
        announce(t('empty.startFailed'));
      } finally {
        busy.current = false;
        setStartingId(null);
      }
    },
    [onStarted, t],
  );

  return {
    /** The starter being set up, if any: disable every action meanwhile. */
    startingId,
    /** The last start failed; show `today:empty.startFailed`. */
    failed,
    start,
  };
}
