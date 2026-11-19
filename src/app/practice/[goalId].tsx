import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { PracticeScreen } from '@/features/practice/PracticeScreen';
import { setPracticeInFront } from '@/services/links';

export default function PracticeRoute() {
  // `chunk` names one chunk to practice (Today's optional seal check);
  // without it the goal's next step is served.
  const { goalId, chunk } = useLocalSearchParams<{ goalId: string; chunk?: string }>();
  // Lets a widget tap that arrives while this session is in front be
  // ignored instead of opening a second one (`+native-intent`).
  useFocusEffect(
    useCallback(() => {
      setPracticeInFront(true);
      return () => setPracticeInFront(false);
    }, []),
  );
  return <PracticeScreen goalId={goalId} chunkId={chunk} />;
}
