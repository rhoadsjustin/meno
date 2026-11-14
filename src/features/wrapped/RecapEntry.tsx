/**
 * Ways into Year in the Word (docs/10 §5.5): a quiet card on Today and a
 * row on Stats, shown in season (Dec 1 – Jan 31) or with the tester
 * preview on. Before three days of practice the Today card says what
 * opens it instead of linking to an empty recap. The Today card can be
 * closed for the year; the Stats row stays. Finished years stay
 * reachable from a quiet group at the bottom of Stats (§5.4, "Past years").
 */
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/components/button';
import { Card } from '@/components/card';
import { NavRow } from '@/components/nav-row';
import { SymbolIcon } from '@/components/symbol';
import { useTranslation } from '@/i18n/react';
import {
  dismissRecapCard,
  recapCardDismissed,
  wrappedPreview,
  type RecapCardDismissal,
} from '@/services/db/repos/appFlags';
import { localToday } from '@/services/db/repos/streaks';
import { activeDaysIn, loadPastRecapYears } from '@/services/db/repos/wrapped';
import { RECAP_MIN_DAYS, recapYearFor } from '@/services/wrapped';
import { fonts, spacing, useThemeColors, textStyle } from '@/theme';

export type RecapOffer = {
  year: number;
  ready: boolean;
  /** The Today card the user closed this year, if any. Stats ignores it. */
  dismissed: RecapCardDismissal | null;
};

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
        const [days, dismissed] = await Promise.all([activeDaysIn(year), recapCardDismissed(year)]);
        if (live) setOffer({ year, ready: days >= RECAP_MIN_DAYS, dismissed });
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
  // Closed just now; the stored flag takes over at the next focus.
  const [closed, setClosed] = useState<{ year: number; which: RecapCardDismissal } | null>(null);
  if (!offer) return null;
  const which: RecapCardDismissal = offer.ready ? 'ready' : 'notYet';
  const dismissed = closed?.year === offer.year ? closed.which : offer.dismissed;
  // Closing the "not yet" line leaves the card that opens the recap to come.
  if (dismissed === 'ready' || dismissed === which) return null;
  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('todayCardDismiss')}
      hitSlop={4}
      onPress={() => {
        setClosed({ year: offer.year, which });
        void dismissRecapCard(offer.year, which).catch(() => {});
        AccessibilityInfo.announceForAccessibility(
          t(offer.ready ? 'todayCardDismissed' : 'notYetDismissed'),
        );
      }}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
      <SymbolIcon ios="xmark" android="close" size={13} weight="semibold" color={colors.inkFaint} />
    </Pressable>
  );
  return (
    <Card>
      <View style={styles.row}>
        {offer.ready ? (
          <NavRow
            title={t('todayCard', { year: offer.year })}
            detail={t('todayCardHint')}
            // The hint is the detail line; read once, as the hint.
            accessibilityLabel={t('todayCard', { year: offer.year })}
            accessibilityHint={t('todayCardHint')}
            onPress={() => open(offer.year)}
            style={styles.text}
          />
        ) : (
          <Text style={[styles.hint, styles.text, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('notYet')}
          </Text>
        )}
        {close}
      </View>
    </Card>
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
      onPress={() => open(offer.year)}
      style={({ pressed }) => pressed && styles.pressed}>
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

/** Finished years with a recap to reopen, re-read on focus. Newest first. */
export function usePastRecapYears(): number[] {
  const [years, setYears] = useState<number[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadPastRecapYears()
        .then((found) => live && setYears(found))
        .catch(() => live && setYears([]));
      return () => {
        live = false;
      };
    }, []),
  );
  return years;
}

/** Stats' "Year in the Word" group: one row per finished year. */
export function RecapPastYears({ years }: { years: number[] }) {
  const colors = useThemeColors();
  const { t } = useTranslation('wrapped');
  if (years.length === 0) return null;
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.groupTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('pastYears')}
      </Text>
      {years.map((year, i) => (
        <Pressable
          key={year}
          accessibilityRole="button"
          accessibilityLabel={t('statsRow', { year })}
          onPress={() => open(year)}
          style={({ pressed }) => [
            styles.row,
            styles.pastRow,
            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.pastTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {t('statsRow', { year })}
          </Text>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors.inkFaint} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  // A 44pt target for a 13pt mark; the negative margins keep the mark, not
  // the target, on the card's padding.
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.md,
    marginVertical: -spacing.sm,
  },
  hint: textStyle.subheadline,
  rowTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  // Matches the Stats cards' section titles.
  groupTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  pastRow: { minHeight: 44 },
  pastTitle: { flex: 1, fontSize: 17 },
});
