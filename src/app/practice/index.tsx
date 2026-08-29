/**
 * `/practice` without a goal id (widget tap target): resolve to the active
 * goal's session, or land home when there is nothing to practice.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { activeGoal } from '@/services/db/repos/goals';

export default function PracticeIndexRoute() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const goal = await activeGoal();
        setTarget(goal ? `/practice/${goal.id}` : '/');
      } catch {
        setTarget('/');
      }
    })();
  }, []);

  if (!target) return null;
  return <Redirect href={target as never} />;
}
