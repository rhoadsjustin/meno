import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import {
  RecapPastYears,
  RecapStatsRow,
  usePastRecapYears,
  useRecapOffer,
} from '@/features/wrapped/RecapEntry';
import { useTranslation } from '@/i18n/react';
import { BADGE_CODES, badgeHint, badgeName, earnedBadges } from '@/services/db/repos/badges';
import { loadStats, type Stats } from '@/services/db/repos/stats';
import { loadStreak } from '@/services/db/repos/streaks';
import { useThemeColors, fonts, radius, spacing, type ThemeColors, displayType } from '@/theme';

/** From this text scale the three numerals and the badges stack as rows:
 * a third of a phone's width cannot hold a 40pt "100%" (Library's switch). */
const STACK_TEXT_SCALE = 1.4;

export default function StatsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['stats', 'common', 'app']);
  // Windows wider than tall: numerals and the practice grid beside the
  // badge case. Otherwise one column, with the badges in their place in it.
  const { twoPane } = useContentLayout();
  const stacked = useWindowDimensions().fontScale >= STACK_TEXT_SCALE;
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [earned, setEarned] = useState<Map<string, Date>>(new Map());
  const recapOffer = useRecapOffer();
  // Finished years stay reachable after the season ends (docs/10 §5.4).
  const pastYears = usePastRecapYears();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [s, st, e] = await Promise.all([loadStats(), loadStreak(), earnedBadges()]);
        if (!cancelled) {
          setStats(s);
          setStreak({ current: st.current, longest: st.longest });
          setEarned(e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Three large New York numerals (07 §6).
  const numerals = (
    <View style={stacked ? styles.heroStack : styles.heroRow}>
      <Numeral
        value={String(streak.current)}
        label={t('numeral.streak', { count: streak.current })}
        stacked={stacked}
        colors={colors}
      />
      <Numeral
        value={
          stats?.accuracy30 != null
            ? t('common:percent', { value: Math.round(stats.accuracy30 * 100) })
            : '—'
        }
        label={t('numeral.accuracy')}
        // Not "dash, 30-day accuracy".
        spoken={stats?.accuracy30 != null ? undefined : t('numeral.accuracyNone')}
        stacked={stacked}
        colors={colors}
      />
      <Numeral
        value={String(stats?.versesMemorized ?? 0)}
        label={t('numeral.memorized', { count: stats?.versesMemorized ?? 0 })}
        stacked={stacked}
        colors={colors}
      />
    </View>
  );

  const practice = (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('practice')}
      </Text>
      <View
        style={styles.grid}
        accessible
        accessibilityLabel={
          stats
            ? t('practicedOn', {
                practiced: stats.practiceDays.filter((d) => d.practiced).length,
                total: stats.practiceDays.length,
              })
            : t('practiceDays')
        }>
        {stats?.practiceDays.map((d) => (
          <View
            key={d.date}
            style={[
              styles.cell,
              { backgroundColor: d.practiced ? colors.lapis : colors.lapisWash },
            ]}
          />
        ))}
      </View>
      {stats && (stats.recitations > 0 || stats.overrides > 0) && (
        <Text style={[styles.neutral, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('lockSummary', {
            recitations: t('recitationCount', { count: stats.recitations }),
            overrides: t('overrideCount', { count: stats.overrides }),
          })}
        </Text>
      )}
    </Card>
  );

  const badges = (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('badgesTitle')}
      </Text>
      <View style={stacked ? styles.badgeList : styles.badges}>
        {BADGE_CODES.map((code) => {
          const isEarned = earned.has(code);
          const name = badgeName(code);
          return (
            <View
              key={code}
              accessible
              accessibilityLabel={t('badgeSpoken', {
                name,
                status: isEarned ? t('earned') : badgeHint(code),
              })}
              style={stacked ? styles.badgeRow : styles.badge}>
              <View
                style={[
                  styles.medallion,
                  {
                    borderColor: isEarned ? colors.gold : colors.inkFaint,
                    backgroundColor: isEarned ? colors.gold : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    styles.medallionGlyph,
                    {
                      color: isEarned ? colors.surfaceRaised : colors.inkFaint,
                      fontFamily: fonts?.scripture,
                    },
                  ]}>
                  {name[0]}
                </Text>
              </View>
              <Text
                // Two lines before it clips: "Word hoard III" at one text
                // size up is wider than the column. Stacked, it wraps freely.
                numberOfLines={stacked ? undefined : 2}
                style={[
                  stacked ? styles.badgeRowName : styles.badgeName,
                  { color: isEarned ? colors.ink : colors.inkFaint, fontFamily: fonts?.ui },
                ]}>
                {name}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );

  return (
    <Screen title={t('app:tabs.stats')} wide>
      {/* Always the row: with no second pane the first keeps its place in
          the tree, so folding and unfolding does not remount the screen. */}
      <FoldAwareRow>
        <>
          {numerals}
          <RecapStatsRow offer={recapOffer} />
          {practice}
          {!twoPane && badges}
          <RecapPastYears years={pastYears} />
        </>
        {twoPane ? badges : null}
      </FoldAwareRow>
    </Screen>
  );
}

function Numeral({
  value,
  label,
  spoken,
  stacked,
  colors,
}: {
  value: string;
  label: string;
  /** VoiceOver label when "value label" would not read as a sentence. */
  spoken?: string;
  /** A row of its own, value leading and label beside it. */
  stacked: boolean;
  colors: ThemeColors;
}) {
  const { t } = useTranslation('stats');
  return (
    <View
      accessible
      accessibilityLabel={spoken ?? t('numeral.spoken', { value, label })}
      style={stacked ? styles.numeralStacked : styles.numeral}>
      {/* One line, shrinking to fit: a number never breaks mid-value. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.numeralValue,
          stacked && styles.numeralValueStacked,
          { color: colors.ink, fontFamily: fonts?.scripture },
        ]}>
        {value}
      </Text>
      <Text
        style={[
          styles.numeralLabel,
          stacked && styles.numeralLabelStacked,
          { color: colors.inkFaint, fontFamily: fonts?.ui },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  heroStack: { gap: spacing.md },
  numeral: { flex: 1 },
  // The label sits beside the value, and under it once the two no longer
  // fit on a line (the largest accessibility sizes).
  numeralStacked: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.md,
  },
  numeralValue: { fontSize: displayType.small },
  numeralValueStacked: { maxWidth: '100%' },
  numeralLabel: { fontSize: 12, marginTop: spacing.xs },
  numeralLabelStacked: { flexShrink: 1, marginTop: 0 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 14, height: 14, borderRadius: radius.cell },
  neutral: { fontSize: 13, marginTop: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  badge: { width: 72, alignItems: 'center', gap: spacing.xs },
  medallion: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionGlyph: { fontSize: 22 },
  badgeName: { fontSize: 11, textAlign: 'center' },
  // Large text: one badge per row, medallion then the whole name.
  badgeList: { gap: spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeRowName: { flex: 1, fontSize: 11 },
});
