/**
 * The Advent plan's link (docs/11 §3). `meno:///advent` lands on Today,
 * where the card is; `?preview=1` shows the card out of season for testers
 * (`?preview=0` turns that off).
 */
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { setAdventPreview } from '@/services/db/repos/appFlags';

export default function AdventRoute() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const setsPreview = preview === '1' || preview === '0';
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!setsPreview) return;
    let live = true;
    setAdventPreview(preview === '1')
      .catch(() => {})
      .finally(() => live && setSaved(true));
    return () => {
      live = false;
    };
  }, [preview, setsPreview]);

  // Today reads the flag when it gains focus, so write it before going there.
  if (setsPreview && !saved) return <Stack.Screen options={{ headerShown: false }} />;
  return <Redirect href="/" />;
}
