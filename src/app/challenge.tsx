/**
 * Challenge join screen (docs/06 §5, backendless slice). Opened by a shared
 * `meno://challenge?...` link: shows the passage being challenged, then
 * creates the same goal locally with the shared `challengeId` attached.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { contentColumn } from '@/components/content-layout';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { t as translate } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import {
  availableTranslations,
  DEFAULT_TRANSLATION_ID,
  formatRange,
  getTranslation,
} from '@/services/bible';
import {
  challengeTargetDate,
  ChallengeLinkError,
  friendlyDate,
  isPassageTitle,
  parseChallengeParams,
  type Challenge,
} from '@/services/challenges';
import {
  createGoal,
  goalByChallengeId,
  previewGoal,
  type Goal,
  type GoalPreview,
} from '@/services/db/repos/goals';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

type JoinState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'joined'; goal: Goal }
  | { kind: 'ready'; preview: GoalPreview };

export default function ChallengeRoute() {
  return (
    <ModalSafeArea>
      <ChallengeScreen />
    </ModalSafeArea>
  );
}

function ChallengeScreen() {
  const colors = useThemeColors();
  const { t: tr } = useTranslation(['challenge', 'goals', 'common']);
  // Key the parse on the raw values: a second challenge link opened while
  // this modal is already up must replace its content, not show the first.
  const { v, c, t, s, e, n, d } = useLocalSearchParams<Record<string, string>>();
  const parsed = useMemo<{ challenge: Challenge } | { error: string }>(() => {
    try {
      return { challenge: parseChallengeParams({ v, c, t, s, e, n, d }) };
    } catch (err) {
      return {
        error:
          err instanceof ChallengeLinkError ? err.message : translate('challenge:errors.malformed'),
      };
    }
  }, [v, c, t, s, e, n, d]);
  const challenge = 'challenge' in parsed ? parsed.challenge : null;

  // The sender's translation when this device can use it, else the default
  // (e.g. an ESV challenge landing on a device with no ESV key).
  const translationId =
    challenge && availableTranslations().some((t) => t.id === challenge.translationId)
      ? challenge.translationId
      : DEFAULT_TRANSLATION_ID;
  const translationSwapped = challenge !== null && translationId !== challenge.translationId;

  // Async state is tagged with the code it belongs to, so a new link opened
  // over this modal shows loading (not the previous link's result) with no
  // synchronous reset in the effect.
  const [state, setState] = useState<{ code: string; result: JoinState } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    const code = challenge.code;
    let cancelled = false;
    const put = (result: JoinState) => {
      if (!cancelled) setState({ code, result });
    };
    (async () => {
      const existing = await goalByChallengeId(code);
      if (existing) {
        put({ kind: 'joined', goal: existing });
        return;
      }
      const preview = await previewGoal(translationId, challenge.range);
      put({ kind: 'ready', preview });
    })().catch(() => {
      put({ kind: 'invalid', message: translate('challenge:errors.passageNotFound') });
    });
    return () => {
      cancelled = true;
    };
  }, [challenge, translationId]);

  // A parse error always wins over whatever the async check last produced.
  const view: JoinState =
    'error' in parsed
      ? { kind: 'invalid', message: parsed.error }
      : state && state.code === parsed.challenge.code
        ? state.result
        : { kind: 'loading' };

  const accept = async () => {
    if (!challenge || busy) return;
    setBusy(true);
    try {
      const goal = await createGoal({
        translationId,
        range: challenge.range,
        title: challenge.title,
        targetDate: challengeTargetDate(challenge),
        challengeId: challenge.code,
      });
      router.replace(`/practice/${goal.id}`);
    } catch {
      setBusy(false);
      setState({
        code: challenge.code,
        result: { kind: 'invalid', message: translate('challenge:joinFailed') },
      });
    }
  };

  // A link that cold-starts the app makes this the stack's root, which iOS
  // shows full-screen rather than as a sheet. The insets are this modal's own
  // (ModalSafeArea), so it pads under the status bar there and adds nothing
  // in a sheet — and on iPhone Duo's cover panel, where the sheet is
  // full-width, the sides keep Join clear of the status strip.
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.surfaceRaised }]}>
      <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
        <Text style={[styles.kicker, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {tr('invitation')}
        </Text>

        {view.kind === 'loading' && <ActivityIndicator style={styles.spinner} />}

        {view.kind === 'invalid' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {tr('invalidHeading')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {view.message}
            </Text>
          </>
        )}

        {view.kind === 'joined' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {tr('joinedHeading')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {tr('joinedBody', { title: view.goal.title })}
            </Text>
          </>
        )}

        {view.kind === 'ready' && challenge && (
          <>
            {!isPassageTitle(challenge.title, challenge.range) && (
              <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {challenge.title}
              </Text>
            )}
            <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {formatRange(challenge.range)}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {challenge.targetDate
                ? tr('translationDue', {
                    abbrev: getTranslation(translationId).abbrev,
                    date: friendlyDate(challenge.targetDate),
                  })
                : getTranslation(translationId).abbrev}
            </Text>
            <View style={styles.statsRow}>
              <Stat label={tr('goals:stats.verses')} value={String(view.preview.verseCount)} />
              <Stat label={tr('goals:stats.chunks')} value={String(view.preview.chunks.length)} />
              <Stat label={tr('goals:stats.estDays')} value={`~${view.preview.projectedDays}`} />
            </View>
            {translationSwapped && (
              <Text style={[styles.note, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {tr('swapped', {
                  shared: getTranslation(challenge.translationId).abbrev,
                  local: getTranslation(translationId).abbrev,
                })}
              </Text>
            )}
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {tr('joinNote')}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.footerSecondary}>
          <Text style={[styles.footerSecondaryText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {view.kind === 'ready' ? tr('common:notNow') : tr('common:close')}
          </Text>
        </Pressable>
        {view.kind === 'ready' && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void accept()}
            style={[styles.footerPrimary, { backgroundColor: colors.lapis, opacity: busy ? 0.6 : 1 }]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.footerPrimaryText, { fontFamily: fonts?.ui }]}>{tr('join')}</Text>
            )}
          </Pressable>
        )}
        {view.kind === 'joined' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/practice/${view.goal.id}`)}
            style={[styles.footerPrimary, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.footerPrimaryText, { fontFamily: fonts?.ui }]}>{tr('practice')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text style={[styles.statValue, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
  kicker: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  spinner: { marginTop: spacing.xxl },
  heading: { fontSize: 22, fontWeight: '700' },
  passage: { fontSize: 28, marginTop: spacing.xs },
  body: { fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  note: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginVertical: spacing.md },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    // The bottom safe-area edge already clears the home indicator.
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSecondary: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  footerSecondaryText: { fontSize: 17 },
  footerPrimary: {
    borderRadius: 999,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    minWidth: 160,
    alignItems: 'center',
  },
  footerPrimaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
