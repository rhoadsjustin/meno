import { useLocalSearchParams } from 'expo-router';

import { PracticeScreen } from '@/features/practice/PracticeScreen';

export default function PracticeRoute() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  return <PracticeScreen goalId={goalId} />;
}
