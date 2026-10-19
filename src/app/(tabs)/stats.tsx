import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import { useTranslation } from '@/i18n/react';
import { BADGE_CODES, badgeHint, badgeName, earnedBadges } from '@/services/db/repos/badges';
import { loadStats, type Stats } from '@/services/db/repos/stats';
import { loadStreak } from '@/services/db/repos/streaks';
import { useThemeColors, fonts, spacing, type ThemeColors } from '@/theme';

export default function StatsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['stats', 'common', 'app']);
  // Wide windows: numerals and the practice grid beside the badge case.
  const { isWide } = useContentLayout();
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [earned, setEarned] = useState<Map<string, Date>>(new Map());

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
    <View style={styles.heroRow}>
      <Numeral
        value={String(streak.current)}
        label={t('numeral.streak', { count: streak.current })}
        colors={colors}
      />
      <Numeral
        value={
          stats?.accuracy30 != null
            ? t('common:percent', { value: Math.round(stats.accuracy30 * 100) })
            : '—'
        }
        label={t('numeral.accuracy')}
        colors={colors}
      />
      <Numeral
        value={String(stats?.versesMemorized ?? 0)}
        label={t('numeral.memorized', { count: stats?.versesMemorized ?? 0 })}
        colors={colors}
      />
    </View>
  );

  const practice = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
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
      <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('badgesTitle')}
      </Text>
      <View style={styles.badges}>
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
              style={styles.badge}>
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
                numberOfLines={1}
                style={[
                  styles.badgeName,
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
      {isWide ? (
        <FoldAwareRow>
          <>
            {numerals}
            {practice}
          </>
          {badges}
        </FoldAwareRow>
      ) : (
        <>
          {numerals}
          {practice}
          {badges}
        </>
      )}
    </Screen>
  );
}

function Numeral({ value, label, colors }: { value: string; label: string; colors: ThemeColors }) {
  const { t } = useTranslation('stats');
  return (
    <View
      accessible
      accessibilityLabel={t('numeral.spoken', { value, label })}
      style={styles.numeral}>
      <Text style={[styles.numeralValue, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {value}
      </Text>
      <Text style={[styles.numeralLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  numeral: { flex: 1 },
  numeralValue: { fontSize: 40 },
  numeralLabel: { fontSize: 12, marginTop: spacing.xs },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 14, height: 14, borderRadius: 3 },
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
  badgeName: { fontSize: 11 },
});
