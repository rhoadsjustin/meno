/**
 * The Advent plan on Today (docs/11 §3.2), from the Sunday before Advent
 * through Christmas Day: an invitation to start the passage, and once it is
 * started a quiet line saying where the plan stands this week.
 *
 * Starting goes through the challenge join screen with the plan's shared
 * code, so the card, the web page and a friend's link all make the same goal.
 */
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useTranslation } from '@/i18n/react';
import { adventFor, adventPlan, adventWeek, type AdventPlan, type AdventTrack } from '@/services/advent';
import { formatRange, refToOsis } from '@/services/bible';
import { STARTER_TRANSLATION_ID } from '@/services/bible/starters';
import { CHALLENGE_VERSION } from '@/services/challenges';
import { adventDismissed, adventPreview, setAdventDismissed } from '@/services/db/repos/appFlags';
import { activeGoal, goalByChallengeId, type Goal } from '@/services/db/repos/goals';
import { localToday } from '@/services/db/repos/streaks';
import { fonts, radius, spacing, useThemeColors } from '@/theme';

export type AdventOffer = {
  plan: AdventPlan;
  /** 0 before the first Sunday, then 1–4. */
  week: 0 | 1 | 2 | 3 | 4;
  today: string;
  /** The Advent goal on this device and which track it is, once started. */
  joined: { goal: Goal; track: 'main' | 'short' } | null;
  dismissed: boolean;
  /** The translation a new Advent goal is made in. */
  translationId: string;
};

async function readOffer(): Promise<AdventOffer | null> {
  const today = localToday();
  const plan =
    adventFor(today) ?? ((await adventPreview()) ? adventPlan(Number(today.slice(0, 4))) : null);
  if (!plan) return null;
  const [main, short, dismissed, current] = await Promise.all([
    goalByChallengeId(plan.main.code),
    goalByChallengeId(plan.short.code),
    adventDismissed(plan.year),
    activeGoal(),
  ]);
  return {
    plan,
    week: adventWeek(plan, today),
    today,
    joined: main ? { goal: main, track: 'main' } : short ? { goal: short, track: 'short' } : null,
    dismissed,
    // Someone already memorizing reads Advent in the translation they chose.
    translationId: current?.translationId ?? STARTER_TRANSLATION_ID,
  };
}

/** The Advent plan on offer right now, re-read each time the screen gains focus. */
export function useAdventOffer(): { offer: AdventOffer | null; dismiss: () => void } {
  const [offer, setOffer] = useState<AdventOffer | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      readOffer()
        .then((next) => live && setOffer(next))
        .catch(() => live && setOffer(null));
      return () => {
        live = false;
      };
    }, []),
  );
  const dismiss = useCallback(() => {
    setOffer((current) => {
      if (current) void setAdventDismissed(current.plan.year, true).catch(() => {});
      return current && { ...current, dismissed: true };
    });
  }, []);
  return { offer, dismiss };
}

function join(offer: AdventOffer, track: AdventTrack, title: string) {
  void Haptics.selectionAsync();
  router.push({
    pathname: '/challenge',
    params: {
      v: String(CHALLENGE_VERSION),
      c: track.code,
      t: offer.translationId,
      s: refToOsis(track.range.start),
      e: refToOsis(track.range.end),
      n: title,
      d: offer.plan.ends,
    },
  });
}

/** The invitation: shown until the plan is started or the card is closed. */
export function AdventInviteCard({ offer, onDismiss }: { offer: AdventOffer | null; onDismiss: () => void }) {
  const colors = useThemeColors();
  const { t } = useTranslation('advent');
  if (!offer || offer.joined || offer.dismissed) return null;
  const main = formatRange(offer.plan.main.range);
  const short = formatRange(offer.plan.short.range);
  return (
    <Card>
      <Text style={[styles.kicker, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>{t('kicker')}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {t('title')}
      </Text>
      <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('body', { passage: main })}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => join(offer, offer.plan.main, t('goalTitle', { passage: main }))}
        style={[styles.button, { backgroundColor: colors.lapis }]}>
        <Text style={[styles.buttonText, { fontFamily: fonts?.ui }]}>{t('start', { passage: main })}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => join(offer, offer.plan.short, t('goalTitle', { passage: short }))}>
          <Text style={[styles.action, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('startShort', { passage: short })}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            onDismiss();
            AccessibilityInfo.announceForAccessibility(t('dismissed'));
          }}>
          <Text style={[styles.action, styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('dismiss')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

/** Once started: which week it is and that week's verses; opens the passage. */
export function AdventProgressCard({ offer }: { offer: AdventOffer | null }) {
  const colors = useThemeColors();
  const { t } = useTranslation('advent');
  if (!offer?.joined || offer.joined.goal.status !== 'active') return null;
  const { plan, week, joined } = offer;
  const whole = formatRange(joined.track === 'main' ? plan.main.range : plan.short.range);
  const christmas = offer.today >= plan.ends;
  const title = christmas ? t('progress.christmas') : week === 0 ? t('progress.before') : t('progress.week', { week });
  const detail = christmas
    ? t('progress.fromMemory', { passage: whole })
    : joined.track === 'main' && week > 0
      ? t('progress.thisWeek', { passage: formatRange(plan.weeks[week - 1]) })
      : t('progress.byChristmas', { passage: whole });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityHint={t('progress.hint')}
      onPress={() => router.push(`/practice/${joined.goal.id}`)}>
      <Card>
        <View style={styles.row}>
          <View style={styles.text}>
            <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>{title}</Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>{detail}</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor={colors.inkFaint}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, marginTop: spacing.xs },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  action: { fontSize: 15, fontWeight: '600' },
  quiet: { fontWeight: '400' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
});
