import { useLocalSearchParams } from 'expo-router';

import { PracticeScreen } from '@/features/practice/PracticeScreen';

export default function PracticeRoute() {
  // `chunk` names one chunk to practice (Today's optional seal check);
  // without it the goal's next step is served.
  const { goalId, chunk } = useLocalSearchParams<{ goalId: string; chunk?: string }>();
  return <PracticeScreen goalId={goalId} chunkId={chunk} />;
}
