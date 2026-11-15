/**
 * The Advent plan's link (docs/11 §3). `meno:///advent` lands on Today,
 * where the card is; `?preview=1` shows the card out of season for testers
 * (`?preview=0` turns that off).
 *
 * Opening the link is asking to see the plan, so it also takes back an
 * earlier "Not this year": the link is the lasting way back to the card and
 * never lands on a Today without it.
 */
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { adventFor } from '@/services/advent';
import { setAdventDismissed, setAdventPreview } from '@/services/db/repos/appFlags';
import { localToday } from '@/services/db/repos/streaks';

export default function AdventRoute() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    const today = localToday();
    // The year the card is read for (in season, or this year's preview).
    const year = adventFor(today)?.year ?? Number(today.slice(0, 4));
    Promise.all([
      preview === '1' || preview === '0' ? setAdventPreview(preview === '1') : null,
      // Turning the tester preview off is not a request to see the card.
      preview === '0' ? null : setAdventDismissed(year, false),
    ])
      .catch(() => {})
      .finally(() => live && setSaved(true));
    return () => {
      live = false;
    };
  }, [preview]);

  // Today reads the flags when it gains focus, so write them before going there.
  if (!saved) return <Stack.Screen options={{ headerShown: false }} />;
  return <Redirect href="/" />;
}
