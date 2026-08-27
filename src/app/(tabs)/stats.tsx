import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { BADGE_DEFS, earnedBadges } from '@/services/db/repos/badges';
import { loadStats, type Stats } from '@/services/db/repos/stats';
import { loadStreak } from '@/services/db/repos/streaks';
import { useThemeColors, fonts, spacing, type ThemeColors } from '@/theme';

export default function StatsScreen() {
  const colors = useThemeColors();
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
    }, [])
  );

  return (
    <Screen title="Stats">
      {/* Three large New York numerals (07 §6). */}
      <View style={styles.heroRow}>
        <Numeral value={String(streak.current)} label="day streak" colors={colors} />
        <Numeral
          value={stats?.accuracy30 != null ? `${Math.round(stats.accuracy30 * 100)}%` : '—'}
          label="30-day accuracy"
          colors={colors}
        />
        <Numeral value={String(stats?.versesMemorized ?? 0)} label="verses memorized" colors={colors} />
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
          Practice
        </Text>
        <View style={styles.grid} accessibilityLabel="Practice days, last five weeks">
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
            Recite to Unlock: {stats.recitations} recitations, {stats.overrides} overrides.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
          Badges
        </Text>
        <View style={styles.badges}>
          {BADGE_DEFS.map((b) => {
            const isEarned = earned.has(b.code);
            return (
              <View
                key={b.code}
                accessibilityLabel={`${b.name}: ${isEarned ? 'earned' : b.hint}`}
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
                    {b.name[0]}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.badgeName,
                    { color: isEarned ? colors.ink : colors.inkFaint, fontFamily: fonts?.ui },
                  ]}>
                  {b.name}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

function Numeral({ value, label, colors }: { value: string; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.numeral}>
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
