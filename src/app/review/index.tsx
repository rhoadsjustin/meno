import { useLocalSearchParams } from 'expo-router';

import { ReviewSession } from '@/features/review/ReviewSession';

export default function ReviewRoute() {
  // `item` names one review (a row of the Due for review list); without it
  // the session serves the most overdue.
  const { item } = useLocalSearchParams<{ item?: string }>();
  return <ReviewSession itemId={item} />;
}
