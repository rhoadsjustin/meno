/**
 * Ways into Year in the Word (docs/10 §5.5): a quiet card on Today and a
 * row on Stats, shown in season (Dec 1 – Jan 31) or with the tester
 * preview on. Before three days of practice the Today card says what
 * opens it instead of linking to an empty recap.
 */
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useTranslation } from '@/i18n/react';
import { wrappedPreview } from '@/services/db/repos/appFlags';
import { localToday } from '@/services/db/repos/streaks';
import { activeDaysIn } from '@/services/db/repos/wrapped';
import { RECAP_MIN_DAYS, recapYearFor } from '@/services/wrapped';
import { fonts, spacing, useThemeColors } from '@/theme';

export type RecapOffer = { year: number; ready: boolean };

/** The recap on offer right now, re-read each time the screen gains focus. */
export function useRecapOffer(): RecapOffer | null {
  const [offer, setOffer] = useState<RecapOffer | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void (async () => {
        const today = localToday();
        const year = recapYearFor(today) ?? ((await wrappedPreview()) ? Number(today.slice(0, 4)) : null);
        if (year === null) {
          if (live) setOffer(null);
          return;
        }
        const days = await activeDaysIn(year);
        if (live) setOffer({ year, ready: days >= RECAP_MIN_DAYS });
      })().catch(() => live && setOffer(null));
      return () => {
        live = false;
      };
    }, []),
  );
  return offer;
}

function open(year: number) {
  router.push({ pathname: '/wrapped', params: { year: String(year) } });
}

export function RecapTodayCard({ offer }: { offer: RecapOffer | null }) {
  const colors = useThemeColors();
  const { t } = useTranslation('wrapped');
  if (!offer) return null;
  if (!offer.ready) {
    return (
      <Card>
        <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>{t('notYet')}</Text>
      </Card>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('todayCard', { year: offer.year })}
      accessibilityHint={t('todayCardHint')}
      onPress={() => open(offer.year)}>
      <Card>
        <View style={styles.row}>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {t('todayCard', { year: offer.year })}
            </Text>
            <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('todayCardHint')}
            </Text>
          </View>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors.inkFaint} />
        </View>
      </Card>
    </Pressable>
  );
}

export function RecapStatsRow({ offer }: { offer: RecapOffer | null }) {
  const colors = useThemeColors();
  const { t } = useTranslation('wrapped');
  if (!offer?.ready) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('statsRow', { year: offer.year })}
      onPress={() => open(offer.year)}>
      <Card>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {t('statsRow', { year: offer.year })}
          </Text>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors.inkFaint} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  title: { fontSize: 19, fontWeight: '600' },
  hint: { fontSize: 15, lineHeight: 20 },
  rowTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
});
