/**
 * `/practice` without a goal id (widget tap target): resolve to the active
 * goal's session, or land home when there is nothing to practice.
 *
 * A tap that arrives while a session is in front never gets here
 * (`+native-intent` drops it). One that arrives while a session is open
 * under another screen goes back to that session rather than opening a
 * second one over it.
 */
import { Redirect, router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

import { activeGoal } from '@/services/db/repos/goals';
import { screensAboveOpenSession } from '@/services/links';

export default function PracticeIndexRoute() {
  const navigation = useNavigation();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const above = screensAboveOpenSession(navigation.getState()?.routes.map((r) => r.name) ?? []);
    if (above !== null && above > 0) {
      router.dismiss(above);
      return;
    }
    void (async () => {
      try {
        const goal = await activeGoal();
        setTarget(goal ? `/practice/${goal.id}` : '/');
      } catch {
        setTarget('/');
      }
    })();
  }, [navigation]);

  if (!target) return null;
  return <Redirect href={target as never} />;
}
