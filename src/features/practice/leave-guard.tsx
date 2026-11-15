/**
 * Asks before a session screen is left while a round holds typed or spoken
 * words. Only the session's position is saved, so those words would be lost
 * without a word of warning — to the Close button, the edge swipe or
 * Android's back alike, which all arrive here as the same removal.
 *
 * The host (practice, review, stitch) calls `useLeaveGuard` and wraps its
 * rounds in `UnsavedInputProvider`; a round with a text field calls
 * `useUnsavedInput(hasWords)`. Outside a provider that hook does nothing, so
 * the unlock screen, which must never stand between a person and their
 * phone, is unaffected.
 */
import { usePreventRemove } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useTranslation } from '@/i18n/react';

type Report = (delta: 1 | -1) => void;

const UnsavedInputContext = createContext<Report>(() => {});

export const UnsavedInputProvider = UnsavedInputContext.Provider;

/** Tells the host screen this round holds words that leaving would lose. */
export function useUnsavedInput(dirty: boolean) {
  const report = useContext(UnsavedInputContext);
  useEffect(() => {
    if (!dirty) return;
    report(1);
    // Also when the round goes away: a checked round has nothing to lose.
    return () => report(-1);
  }, [dirty, report]);
}

/**
 * Guards the screen it is called from. Returns the value for
 * `UnsavedInputProvider`.
 */
export function useLeaveGuard(): Report {
  const { t } = useTranslation('practice');
  // A count, not a flag: Speak's typed fallback nests Type inside it, and
  // each reports for itself.
  const [holders, setHolders] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const report = useCallback<Report>((delta) => setHolders((n) => Math.max(0, n + delta)), []);

  usePreventRemove(holders > 0 && !leaving, ({ repeat }) => {
    Alert.alert(t('leave.title'), t('leave.message'), [
      { text: t('leave.stay'), style: 'cancel' },
      {
        text: t('leave.leave'),
        style: 'destructive',
        onPress: () => {
          setLeaving(true);
          repeat();
        },
      },
    ]);
  });

  return report;
}
