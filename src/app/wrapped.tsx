/**
 * Year in the Word (docs/10). `meno:///wrapped` opens the year on offer;
 * `?year=2026` picks one; `?preview=1` turns on the out-of-season entry
 * points for testers (`?preview=0` turns them off).
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ReservedRegionsProvider } from '@modules/reserved-regions';

import { ModalSafeArea } from '@/components/modal-safe-area';
import { WrappedScreen } from '@/features/wrapped/WrappedScreen';
import { setWrappedPreview } from '@/services/db/repos/appFlags';
import { localToday } from '@/services/db/repos/streaks';
import { recapYearFor } from '@/services/wrapped';

export default function WrappedRoute() {
  const params = useLocalSearchParams<{ year?: string; preview?: string }>();
  const asked = Number(params.year);
  const year =
    Number.isInteger(asked) && asked > 2000 && asked < 3000
      ? asked
      : (recapYearFor(localToday()) ?? new Date().getFullYear());

  useEffect(() => {
    if (params.preview === '1' || params.preview === '0') {
      void setWrappedPreview(params.preview === '1');
    }
  }, [params.preview]);

  return (
    <ModalSafeArea>
      <ReservedRegionsProvider>
        <WrappedScreen year={year} />
      </ReservedRegionsProvider>
    </ModalSafeArea>
  );
}
