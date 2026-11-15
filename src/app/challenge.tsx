/**
 * Challenge join screen (docs/06 §5, backendless slice). Opened by a shared
 * `meno://challenge?...` link: shows the passage being challenged, then
 * creates the same goal locally with the shared `challengeId` attached.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBarIcon } from '@/components/bar-icon';
import { closeModal } from '@/components/close-modal';
import { contentColumn } from '@/components/content-layout';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { announce } from '@/components/screen-reader';
import { t as translate } from '@/i18n';
import { Button } from '@/components/button';
import { Unavailable } from '@/components/unavailable';
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
  targetDateStanding,
  type Challenge,
  type ChallengeLinkReason,
} from '@/services/challenges';
import {
  createGoal,
  goalByChallengeId,
  previewGoal,
  type Goal,
  type GoalPreview,
} from '@/services/db/repos/goals';
import { localToday } from '@/services/db/repos/streaks';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

/** Meno's App Store listing (the one site/challenge links to). */
const APP_STORE_URL = 'https://apps.apple.com/us/app/meno-scripture-memory/id6806028621';

type JoinState =
  | { kind: 'loading' }
  /** The link itself is wrong (parse errors only). */
  | { kind: 'invalid'; message: string; reason: ChallengeLinkReason }
  /** The link is fine; reading its passage failed and can be tried again. */
  | { kind: 'failed' }
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
  const { t: tr } = useTranslation(['challenge', 'common']);
  const closeIcon = useBarIcon('xmark', 'close');
  // Key the parse on the raw values: a second challenge link opened while
  // this modal is already up must replace its content, not show the first.
  const { v, c, t, s, e, n, d } = useLocalSearchParams<Record<string, string>>();
  const parsed = useMemo<
    { challenge: Challenge } | { error: string; reason: ChallengeLinkReason }
  >(() => {
    try {
      return { challenge: parseChallengeParams({ v, c, t, s, e, n, d }) };
    } catch (err) {
      return err instanceof ChallengeLinkError
        ? { error: err.message, reason: err.reason }
        : { error: translate('challenge:errors.malformed'), reason: 'malformed' };
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
  // The code whose join just failed: Join stays up with a line under it.
  const [joinFailedFor, setJoinFailedFor] = useState<string | null>(null);
  // Bumped by Try again to read the passage once more.
  const [attempt, setAttempt] = useState(0);

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
      // The link parsed, so this is not a bad link: the passage or the
      // database could not be read just now.
      put({ kind: 'failed' });
    });
    return () => {
      cancelled = true;
    };
  }, [challenge, translationId, attempt]);

  const retry = () => {
    setState(null);
    setAttempt((n) => n + 1);
  };

  // A parse error always wins over whatever the async check last produced.
  const view: JoinState =
    'error' in parsed
      ? { kind: 'invalid', message: parsed.error, reason: parsed.reason }
      : state && state.code === parsed.challenge.code
        ? state.result
        : { kind: 'loading' };

  // An old link's date may be behind us, and a plan joined late may not fit
  // before its date: the preview says which, and a past date is not saved.
  const due = targetDateStanding(
    challenge?.targetDate,
    localToday(),
    view.kind === 'ready' ? view.preview.projectedDays : 0,
  );

  const accept = async () => {
    if (!challenge || busy) return;
    setBusy(true);
    setJoinFailedFor(null);
    try {
      const goal = await createGoal({
        translationId,
        range: challenge.range,
        title: challenge.title,
        targetDate: due === 'past' ? undefined : challengeTargetDate(challenge),
        challengeId: challenge.code,
      });
      router.replace(`/practice/${goal.id}`);
    } catch {
      // Stay on the preview so Join can be tapped again.
      setBusy(false);
      setJoinFailedFor(challenge.code);
    }
  };

  // The spinner gives way to the invitation in place: say what arrived. The
  // failed and bad-link states speak for themselves (Unavailable).
  const arrived =
    view.kind === 'ready' && challenge
      ? `${tr('invitation')}: ${
          isPassageTitle(challenge.title, challenge.range)
            ? formatRange(challenge.range)
            : `${challenge.title}, ${formatRange(challenge.range)}`
        }`
      : view.kind === 'joined'
        ? tr('joinedHeading')
        : null;
  useEffect(() => {
    if (arrived) announce(arrived);
  }, [arrived]);

  // A link that can't be used still leads somewhere: the store when it needs
  // a newer Meno (iOS, where the listing is known), otherwise choosing a
  // passage here instead.
  const nextStep =
    view.kind === 'invalid' && view.reason === 'newerVersion' && Platform.OS === 'ios'
      ? {
          label: tr('update'),
          // Nothing to add if the store can't open: the message already says to update.
          onPress: () => void Linking.openURL(APP_STORE_URL).catch(() => {}),
        }
      : { label: tr('choosePassage'), onPress: () => router.replace('/goal-wizard') };

  // "Not now" while there is an invitation to decline, "Close" otherwise.
  const dismissLabel = view.kind === 'ready' ? tr('common:notNow') : tr('common:close');
  const primary =
    view.kind === 'ready' ? (
      <Button label={tr('join')} busy={busy} onPress={() => void accept()} />
    ) : // Only a passage still in progress has anything to practice.
    view.kind === 'joined' && view.goal.status === 'active' ? (
      <Button
        label={tr('practice')}
        onPress={() => router.replace(`/practice/${view.goal.id}`)}
      />
    ) : null;

  // The dismiss control is in the native bar, which clears the status bar
  // whether this is a sheet or (after a cold-start link) full screen, and on
  // iPhone Duo moves to the side with the status strip. The remaining insets
  // are this modal's own (ModalSafeArea): on the Duo's cover panel, where the
  // sheet is full-width, the sides keep Join clear of the status strip.
  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.surfaceRaised }]}>
      <ScreenHeader backHidden title="" backgroundColor={colors.surfaceRaised}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={closeIcon}
            accessibilityLabel={dismissLabel}
            onPress={closeModal}>
            {dismissLabel}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>
      <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
        <SectionHeader kind="kicker" title={tr('invitation')} />

        {view.kind === 'loading' && (
          <ActivityIndicator accessibilityLabel={tr('common:loading')} style={styles.spinner} />
        )}

        {view.kind === 'invalid' && (
          <Unavailable
            kind="failed"
            title={tr('invalidHeading')}
            message={view.message}
            action={nextStep}
          />
        )}

        {view.kind === 'failed' && (
          <Unavailable
            kind="failed"
            title={tr('failedHeading')}
            message={tr('failedBody')}
            action={{ label: tr('common:retry'), onPress: retry }}
          />
        )}

        {view.kind === 'joined' && (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {tr('joinedHeading')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {tr(
                view.goal.status === 'active'
                  ? 'joinedBody'
                  : view.goal.status === 'completed'
                    ? 'joinedBodyMemorized'
                    : 'joinedBodyInactive',
                { title: view.goal.title },
              )}
            </Text>
          </>
        )}

        {view.kind === 'ready' && challenge && (
          <>
            {!isPassageTitle(challenge.title, challenge.range) && (
              <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
                {challenge.title}
              </Text>
            )}
            <Text
              accessibilityRole="header"
              style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {formatRange(challenge.range)}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {challenge.targetDate && (due === 'reachable' || due === 'tight')
                ? tr(due === 'tight' ? 'translationAiming' : 'translationDue', {
                    abbrev: getTranslation(translationId).abbrev,
                    date: friendlyDate(challenge.targetDate),
                  })
                : getTranslation(translationId).abbrev}
            </Text>
            {/* What joining takes on, in words a newcomer knows. */}
            <Text style={[styles.summary, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {tr('summary', {
                verses: tr('common:verseCount', { count: view.preview.verseCount }),
                days: tr('aboutDays', { count: view.preview.projectedDays }),
              })}
            </Text>
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
            {joinFailedFor === challenge.code && <JoinFailedNote message={tr('joinFailed')} />}
          </>
        )}
      </ScrollView>

      {primary && (
        <View style={[styles.footer, { borderTopColor: colors.separator }]}>
          <View style={contentColumn}>{primary}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

/** Under the preview after a failed join; spoken when it appears. */
function JoinFailedNote({ message }: { message: string }) {
  const colors = useThemeColors();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.body, { color: colors.error, fontFamily: fonts?.ui }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
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
  summary: { fontSize: 17, lineHeight: 22, fontWeight: '600', marginTop: spacing.md },
  // The one confirming action; dismissing is the bar's job.
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    // The bottom safe-area edge already clears the home indicator.
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
