import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { BADGE_CODES, badgeHint, badgeName, earnedBadges } from '@/services/db/repos/badges';
import { loadStats, type Stats } from '@/services/db/repos/stats';
import { loadStreak } from '@/services/db/repos/streaks';
import { practiceWeeks } from '@/services/stats/practice-grid';
import {
  useThemeColors,
  fonts,
  radius,
  spacing,
  textStyle,
  type ThemeColors,
  displayType,
} from '@/theme';

/** From this text scale the three numerals stack as rows: a third of a
 * phone's width cannot hold a 40pt "100%" (Library's switch). */

const STACK_TEXT_SCALE = 1.4;

/** Practice grid columns, Monday first (services/stats/practice-grid). */
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function earnedDate(date: Date): string {
  return date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

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

  // Week rows under weekday initials, with the count as a visible caption.
  // One element for VoiceOver: the caption is the whole of what it says.
  const weeks = useMemo(() => practiceWeeks(stats?.practiceDays ?? []), [stats]);
  const practicedOn = stats
    ? t('practicedOn', {
        practiced: stats.practiceDays.filter((d) => d.practiced).length,
        total: stats.practiceDays.length,
      })
    : t('practiceDays');
  const practice = (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('practice')}
      </Text>
      <View accessible accessibilityLabel={practicedOn}>
        <View style={styles.grid}>
          <View style={styles.week}>
            {WEEKDAYS.map((day) => (
              <Text
                key={day}
                // Column heads stay one letter wide at any text size.
                maxFontSizeMultiplier={1.6}
                style={[styles.weekday, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {t(`weekdays.${day}`)}
              </Text>
            ))}
          </View>
          {weeks.map((week, row) => (
            <View key={week.find((c) => c)?.date ?? row} style={styles.week}>
              {week.map((cell, column) =>
                cell ? (
                  <View
                    key={cell.date}
                    style={[
                      styles.cell,
                      // A missed day keeps an outline: its wash alone is
                      // about 1.1:1 against the card.
                      cell.practiced
                        ? { backgroundColor: colors.lapis, borderColor: colors.lapis }
                        : { backgroundColor: colors.lapisWash, borderColor: colors.separator },
                      // Today: a heavier ink ring, practiced or not.
                      cell.today && { borderColor: colors.ink, borderWidth: 2 },
                    ]}
                  />
                ) : (
                  // Before the first day or after today: the column keeps its place.
                  <View key={column} style={styles.cellGap} />
                ),
              )}
            </View>
          ))}
        </View>
        {stats && (
          <Text style={[styles.caption, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {practicedOn}
          </Text>
        )}
      </View>
    </Card>
  );

  // Lifetime totals (06 §2), stated plainly. The lock rows appear once
  // Recite to Unlock has been used.
  const lockUsed = !!stats && (stats.recitations > 0 || stats.overrides > 0);
  const lifetimeRows = stats
    ? [
        { key: 'reviews', label: t('lifetime.reviews'), value: stats.totalReviews },
        ...(lockUsed
          ? [
              { key: 'recitations', label: t('lifetime.recitations'), value: stats.recitations },
              { key: 'overrides', label: t('lifetime.overrides'), value: stats.overrides },
            ]
          : []),
      ]
    : [];
  const lifetime = stats && (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('lifetime.title')}
      </Text>
      {lifetimeRows.map((row, i) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={t('lifetime.spoken', { label: row.label, value: row.value })}
          style={[
            styles.lifetimeRow,
            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
          ]}>
          <Text style={[styles.lifetimeLabel, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {row.label}
          </Text>
          <Text style={[styles.lifetimeValue, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );

  // The badge case as rows: medallion, the whole name, then how to earn it
  // (locked) or when it was earned. Nothing here is interactive.
  const badges = (
    <Card>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('badgesTitle')}
      </Text>
      <View style={styles.badges}>
        {BADGE_CODES.map((code) => {
          const earnedAt = earned.get(code);
          const isEarned = earnedAt !== undefined;
          const name = badgeName(code);
          const detail = isEarned ? t('earnedOn', { date: earnedDate(earnedAt) }) : badgeHint(code);
          // Engraved double rule (07 §7): two concentric rings.
          const rule = isEarned ? colors.gold : colors.inkFaint;
          const glyphColor = isEarned ? colors.surfaceRaised : colors.inkFaint;
          return (
            <View
              key={code}
              accessible
              accessibilityLabel={t('badgeSpoken', { name, status: detail })}
              style={styles.badge}>
              <View
                style={[
                  styles.medallion,
                  { borderColor: rule, backgroundColor: isEarned ? colors.gold : 'transparent' },
                ]}>
                <View
                  pointerEvents="none"
                  style={[styles.medallionInnerRule, { borderColor: isEarned ? glyphColor : rule }]}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  // The medallion is a fixed size; its numeral fits inside it.
                  allowFontScaling={false}
                  style={[styles.medallionGlyph, { color: glyphColor, fontFamily: fonts?.scripture }]}>
                  {t(`badges.${code}.glyph`)}
                </Text>
              </View>
              <View style={styles.badgeText}>
                <Text
                  style={[
                    styles.badgeName,
                    { color: isEarned ? colors.ink : colors.inkFaint, fontFamily: fonts?.ui },
                  ]}>
                  {name}
                </Text>
                <Text style={[styles.badgeDetail, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {detail}
                </Text>
              </View>
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
          {lifetime}
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
  // Seven even columns; capped so cells stay squarish on a wide card.
  grid: { gap: 4, maxWidth: 320 },
  week: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, textAlign: 'center', ...textStyle.caption2 },
  cell: { flex: 1, height: 20, borderRadius: radius.cell, borderWidth: 1 },
  cellGap: { flex: 1, height: 20 },
  caption: { ...textStyle.footnote, marginTop: spacing.md },
  lifetimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    paddingVertical: spacing.sm,
  },
  lifetimeLabel: { ...textStyle.body, flexShrink: 1 },
  lifetimeValue: { ...textStyle.body, fontVariant: ['tabular-nums'] },
  // One badge per row on a phone; two abreast where the card is wide enough.
  badges: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.md },
  badge: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  medallion: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionInnerRule: {
    position: 'absolute',
    top: 2.5,
    right: 2.5,
    bottom: 2.5,
    left: 2.5,
    borderRadius: 26,
    borderWidth: 1,
  },
  // Wide enough for "365" and "III" inside the inner rule before shrinking.
  medallionGlyph: { fontSize: 20, width: 36, textAlign: 'center' },
  badgeText: { flex: 1 },
  badgeName: { ...textStyle.subheadline, fontWeight: '600' },
  badgeDetail: { ...textStyle.footnote },
});
