/**
 * First-launch onboarding (docs/08 M6): the thesis, the notification
 * opt-in ("Can we quiz you out of the blue?"), a visual tour of the widget
 * (Home + Lock Screen) and recite-to-unlock, then straight into practicing
 * a first verse. Skippable at every step, never guilt (06 §6).
 */
import { router } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReservedRegionsProvider } from '@modules/reserved-regions';
import { closeModal } from '@/components/close-modal';
import { contentColumn, contentColumnWide, useContentLayout } from '@/components/content-layout';
import { HomeWidgetShot, LockScreenShot } from '@/components/feature-captures';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { useTranslation } from '@/i18n/react';
import { DEFAULT_STARTER, formatRange, formatRef } from '@/services/bible';
import { markOnboardingDone } from '@/services/db/repos/appFlags';
import { startStarterGoal } from '@/services/db/repos/goals';
import { isLockAvailable } from '@/services/lock';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import { setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

/** `notificationsBlocked`: said yes in Meno, then no to the iOS prompt. */
type Step = 'welcome' | 'notifications' | 'notificationsBlocked' | 'widget' | 'lock';

/**
 * A full-screen modal takes the root view out of the window, and with it the
 * app-wide safe-area provider and reserved-regions observer. This route hosts
 * its own of each: without them the insets froze at the pose onboarding
 * opened in, and the fold was never reported here.
 */
export default function OnboardingRoute() {
  return (
    <ModalSafeArea>
      <ReservedRegionsProvider>
        <Onboarding />
      </ReservedRegionsProvider>
    </ModalSafeArea>
  );
}

/** The verse the widget captures and the shield preview show. */
const PREVIEW_REF = { bookId: 'Phil', chapter: 4, verse: 4 };

function Onboarding() {
  const colors = useThemeColors();
  const { t } = useTranslation(['onboarding', 'common']);
  const { insets, sides, fold, foldAxis, isWide, width, height } = useContentLayout();
  // iPhone Duo half-open: a centred column would put its buttons on the
  // crease, so the column moves into the leading half, clear of the folding
  // region, and returns to the centre when the phone is flat again.
  // The column starts a screen margin in from the leading inset, and keeps
  // a margin's clearance from the crease too.
  const besideFold =
    fold && foldAxis === 'vertical' && fold.x > insets.left
      ? ({
          maxWidth: fold.x - insets.left - layout.screenMargin * 2,
          alignSelf: 'flex-start',
        } as const)
      : null;
  const [chosenStep, setStep] = useState<Step>('welcome');
  // Back from iPhone Settings with notifications allowed: nothing left to
  // say on the blocked step, so carry on.
  const reminders = useReminderStatus();
  const step: Step =
    chosenStep === 'notificationsBlocked' && reminders?.overall === 'on' ? 'widget' : chosenStep;

  const finish = useCallback(async (then?: 'goal-wizard' | 'lock-setup') => {
    await markOnboardingDone();
    closeModal();
    if (then) router.push(`/${then}`);
  }, []);

  // "Try it" skips every decision: the default starter verse becomes the
  // first passage and practice opens on it. One tap only — the ref covers
  // the gap before the disabled button renders.
  const [starting, setStarting] = useState(false);
  const startBusy = useRef(false);
  const tryStarter = useCallback(async () => {
    if (startBusy.current) return;
    startBusy.current = true;
    setStarting(true);
    try {
      const goal = await startStarterGoal(DEFAULT_STARTER);
      await markOnboardingDone();
      // Replace, not back-then-push: Today's empty state showed for a moment
      // between the two.
      router.replace(`/practice/${goal.id}`);
    } catch {
      // Couldn't set it up — Today offers the same verses and the picker.
      await finish();
    }
  }, [finish]);

  // A yes here that iOS then declines must not pass silently: the user
  // would leave onboarding believing reminders are coming.
  const optIn = useCallback(async () => {
    const delivered = await setNotificationsEnabled(true);
    setStep(delivered ? 'widget' : 'notificationsBlocked');
  }, []);

  const welcome = {
    visual: (
      <Text style={[styles.mark, { color: colors.lapis, fontFamily: fonts?.scripture }]}>M</Text>
    ),
    copy: (
      <>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {t('welcome.title')}
        </Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('welcome.body')}
        </Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('welcome.dissolve')}
        </Text>
      </>
    ),
    actions: (
      <Pressable
        accessibilityRole="button"
        onPress={() => setStep('notifications')}
        style={[styles.primary, { backgroundColor: colors.lapis }]}>
        <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>{t('common:continue')}</Text>
      </Pressable>
    ),
  };

  const notifications = {
    visual: null,
    copy: (
      <>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {t('notifications.title')}
        </Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('notifications.body')}
        </Text>
      </>
    ),
    actions: (
      <>
        <Pressable
          accessibilityRole="button"
          onPress={() => void optIn()}
          style={[styles.primary, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
            {t('notifications.optIn')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setStep('widget')}>
          <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('notifications.later')}
          </Text>
        </Pressable>
      </>
    ),
  };

  const notificationsBlocked = {
    visual: null,
    copy: (
      <>
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {t('notificationsBlocked.title')}
        </Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('notificationsBlocked.body')}
        </Text>
        <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('notificationsBlocked.hint')}
        </Text>
      </>
    ),
    actions: (
      <>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={[styles.primary, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
            {t('notificationsBlocked.openSettings')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setStep('widget')}>
          <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('common:notNow')}
          </Text>
        </Pressable>
      </>
    ),
  };

  const widget = {
    title: (
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('widget.title')}
      </Text>
    ),
    visual: (
      <View
        style={styles.shotStack}
        accessible
        accessibilityLabel={t('widget.previewLabel', { ref: formatRef(PREVIEW_REF) })}>
        <HomeWidgetShot />
        <LockScreenShot />
      </View>
    ),
    copy: (
      <>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('widget.body')}
        </Text>
        <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('widget.howTo')}
        </Text>
      </>
    ),
    actions: (
      <Pressable
        accessibilityRole="button"
        onPress={() => setStep('lock')}
        style={[styles.primary, { backgroundColor: colors.lapis }]}>
        <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>{t('common:continue')}</Text>
      </Pressable>
    ),
  };

  const lock = {
    title: (
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('lock.title')}
      </Text>
    ),
    visual: (
      <View accessible accessibilityLabel={t('lock.previewLabel')}>
        <ShieldMock />
      </View>
    ),
    copy: (
      <>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('lock.body')}
        </Text>
        {!isLockAvailable() && (
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('lock.simulatorHint')}
          </Text>
        )}
      </>
    ),
    actions: (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: starting, busy: starting }}
          disabled={starting}
          onPress={() => void tryStarter()}
          style={[
            styles.primary,
            { backgroundColor: colors.lapis },
            starting && styles.primaryBusy,
          ]}>
          <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
            {t('lock.tryStarter', { passage: formatRange(DEFAULT_STARTER.range) })}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void finish('goal-wizard')}>
          <Text style={[styles.quiet, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('lock.chooseOwn')}
          </Text>
        </Pressable>
        {isLockAvailable() && (
          <Pressable accessibilityRole="button" onPress={() => void finish('lock-setup')}>
            <Text style={[styles.quiet, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('lock.setUpLock')}
            </Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => void finish()}>
          <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('lock.exploreFirst')}
          </Text>
        </Pressable>
      </>
    ),
  };

  // Every step as the same four parts; the layout below decides where they go.
  const steps: Record<
    Step,
    { title: ReactNode; visual: ReactNode; copy: ReactNode; actions: ReactNode }
  > = {
    welcome: { title: null, ...welcome },
    notifications: { title: null, ...notifications },
    notificationsBlocked: { title: null, ...notificationsBlocked },
    widget,
    lock,
  };
  const current = steps[step];

  let body: ReactNode;
  if (!isWide) {
    // Phones and iPhone Duo's cover panel: one column, picture above the words.
    body = (
      <>
        {current.title}
        {current.visual}
        {current.copy}
        {current.actions}
      </>
    );
  } else if (current.visual && current.title && width > height) {
    // Wide, short windows (iPhone Duo opened in its landscape pose): the
    // words and buttons on the leading pane, the preview on the trailing one,
    // so the step fits on one screen instead of scrolling past a full-width
    // picture. FoldAwareRow keeps the crease in the gutter when half-open.
    body = (
      <FoldAwareRow style={styles.wideRow}>
        <>
          {current.title}
          {current.copy}
          {current.actions}
        </>
        <>{current.visual}</>
      </FoldAwareRow>
    );
  } else {
    // Otherwise on a wide window (text-only steps, or a tall window such as
    // the opened Duo rotated): a reading-width column, centred, or beside the
    // fold when half-open.
    body = (
      <View style={[styles.narrowColumn, besideFold ?? styles.centred]}>
        {current.title}
        {current.visual}
        {current.copy}
        {current.actions}
      </View>
    );
  }

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={
          isWide
            ? [styles.content, styles.contentWide, contentColumnWide]
            : [styles.content, contentColumn, besideFold]
        }>
        {body}
      </ScrollView>
    </View>
  );
}

/**
 * Screen Time shields can't render in the simulator, so the shield stays a
 * drawn preview (the widget previews are real captures).
 */
function ShieldMock() {
  const colors = useThemeColors();
  const { t } = useTranslation(['onboarding', 'common']);
  return (
    <View style={[styles.shieldMock, { borderColor: colors.separator }]}>
      <Text style={[styles.shieldMockApp, { fontFamily: fonts?.ui }]}>{t('shieldMock.app')}</Text>
      <Text style={[styles.shieldMockVerse, { fontFamily: fonts?.scripture }]}>
        {t('shieldMock.verse', { ref: formatRef(PREVIEW_REF) })}
      </Text>
      <View style={styles.shieldMockButtons}>
        <View style={[styles.shieldMockPill, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.shieldMockPillText, { fontFamily: fonts?.ui }]}>
            {t('shieldMock.recite')}
          </Text>
        </View>
        <Text style={[styles.shieldMockOverride, { fontFamily: fonts?.ui }]}>
          {t('shieldMock.override')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: layout.screenMargin,
    paddingTop: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  // Wide windows are short (669pt on iPhone Duo opened): no tall top margin,
  // and each step sits in the middle of the window rather than at its top.
  contentWide: { flexGrow: 1, justifyContent: 'center', paddingTop: layout.screenMargin },
  wideRow: { alignItems: 'center' },
  narrowColumn: { width: '100%', maxWidth: 520, gap: spacing.lg },
  centred: { alignSelf: 'center' },
  mark: { fontSize: 64 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  hint: { fontSize: 13, lineHeight: 19 },
  primary: {
    marginTop: spacing.xl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBusy: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  quiet: { fontSize: 15, textAlign: 'center', marginTop: spacing.md },

  shotStack: { gap: spacing.sm },
  shieldMock: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#101418',
    padding: spacing.lg,
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  shieldMockApp: { color: '#8A919B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  shieldMockVerse: { color: '#F2F4F7', fontSize: 18 },
  shieldMockButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  shieldMockPill: {
    borderRadius: radius.capsule,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  shieldMockPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  shieldMockOverride: { color: '#8A919B', fontSize: 14 },
});
