/**
 * First-launch onboarding (docs/08 M6): the thesis, the notification
 * opt-in ("Can we quiz you out of the blue?"), a visual tour of the widget
 * (Home + Lock Screen) and recite-to-unlock, then straight into practicing
 * a first verse. Skippable at every step, never guilt (06 §6).
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ReservedRegionsProvider } from '@modules/reserved-regions';
import { closeModal } from '@/components/close-modal';
import { contentColumn, contentColumnWide, useContentLayout } from '@/components/content-layout';
import { HomeWidgetShot, LockScreenShot } from '@/components/feature-captures';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { announce } from '@/components/screen-reader';
import { Button } from '@/components/button';
import { TextLink } from '@/components/text-link';
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
 * Android has no Meno widget yet and no Screen Time, so it skips the widget
 * tour, and the last step keeps only its "start a passage" choices.
 */
const onIos = Platform.OS === 'ios';
const afterNotifications: Step = onIos ? 'widget' : 'lock';

/** Where the Android back button goes from each step. */
const previous: Record<Step, Step | null> = {
  welcome: null,
  notifications: 'welcome',
  notificationsBlocked: 'notifications',
  widget: 'notifications',
  lock: onIos ? 'widget' : 'notifications',
};

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

/** From the accessibility text sizes up, the actions scroll with the step:
 * pinned, three or four of them would take most of a short window. */
const SCROLL_ACTIONS_TEXT_SCALE = 1.4;

/** The verse the widget captures and the shield preview show. */
const PREVIEW_REF = { bookId: 'Phil', chapter: 4, verse: 4 };

function Onboarding() {
  const colors = useThemeColors();
  const { t } = useTranslation(['onboarding', 'common']);
  const { insets, sides, fold, foldAxis, isWide, twoPane } = useContentLayout();
  const { fontScale } = useWindowDimensions();
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
    chosenStep === 'notificationsBlocked' && reminders?.overall === 'on'
      ? afterNotifications
      : chosenStep;

  // Each step replaces the last in place, so nothing tells VoiceOver the page
  // changed (the live region on the blocked title is Android-only): say the
  // new step's title. Not the first one, which the screen opens on.
  const announced = useRef(step);
  useEffect(() => {
    if (announced.current === step) return;
    announced.current = step;
    announce(t(`${step}.title`));
  }, [step, t]);

  // Android's back button walks back through the steps (the modal can't be
  // swiped away on iOS either). From the first step it leaves the app rather
  // than closing onboarding, which Today would only open again.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const back = previous[step];
      if (back) setStep(back);
      else BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [step]);

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
    setStep(delivered ? afterNotifications : 'notificationsBlocked');
  }, []);

  const welcome = {
    visual: (
      // Decoration: VoiceOver would read it as the letter M.
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.mark, { color: colors.lapis, fontFamily: fonts?.scripture }]}>
        M
      </Text>
    ),
    copy: (
      <>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.ink, fontFamily: fonts?.scripture }]}>
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
      <Button
        label={t('common:continue')}
        onPress={() => setStep('notifications')}
        style={styles.primary}
      />
    ),
  };

  const notifications = {
    visual: null,
    copy: (
      <>
        <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {t('notifications.title')}
        </Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('notifications.body')}
        </Text>
      </>
    ),
    actions: (
      <>
        <Button
          label={t('notifications.optIn')}
          onPress={() => void optIn()}
          style={styles.primary}
        />
        <TextLink
          tone="quiet"
          label={t('notifications.later')}
          onPress={() => setStep(afterNotifications)}
          style={styles.quiet}
          labelStyle={styles.quietLabel}
        />
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
        <Button
          label={t('notificationsBlocked.openSettings')}
          onPress={() => void Linking.openSettings()}
          style={styles.primary}
        />
        <TextLink
          tone="quiet"
          label={t('common:notNow')}
          onPress={() => setStep(afterNotifications)}
          style={styles.quiet}
          labelStyle={styles.quietLabel}
        />
      </>
    ),
  };

  const widget = {
    title: (
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
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
      <Button
        label={t('common:continue')}
        onPress={() => setStep('lock')}
        style={styles.primary}
      />
    ),
  };

  const lock = {
    title: (
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('lock.title')}
      </Text>
    ),
    visual: onIos ? (
      <View accessible accessibilityLabel={t('lock.previewLabel')}>
        <ShieldMock />
      </View>
    ) : null,
    copy: (
      <>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('lock.body')}
        </Text>
        {onIos && !isLockAvailable() && (
          <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('lock.unavailableHint')}
          </Text>
        )}
      </>
    ),
    actions: (
      <>
        <Button
          label={t('lock.tryStarter', { passage: formatRange(DEFAULT_STARTER.range) })}
          disabled={starting}
          onPress={() => void tryStarter()}
          style={styles.primary}
        />
        <TextLink
          label={t('lock.chooseOwn')}
          onPress={() => void finish('goal-wizard')}
          style={styles.quiet}
          labelStyle={styles.quietLabel}
        />
        {isLockAvailable() && (
          <TextLink
            label={t('lock.setUpLock')}
            onPress={() => void finish('lock-setup')}
            style={styles.quiet}
            labelStyle={styles.quietLabel}
          />
        )}
        <TextLink
          tone="quiet"
          label={t('lock.exploreFirst')}
          onPress={() => void finish()}
          style={styles.quiet}
          labelStyle={styles.quietLabel}
        />
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

  // Two panes: a step with a picture and a title, on a window wider than tall.
  const split = twoPane && !!current.visual && !!current.title;
  // In the one-column layouts the actions are pinned under the scrolling
  // step, so they stay on screen on short windows (iPhone Duo's cover panel,
  // where the widget captures pushed Continue below the fold) and clear the
  // home indicator. The two-pane layout already fits them beside the picture.
  const pinActions = !split && fontScale < SCROLL_ACTIONS_TEXT_SCALE;

  let body: ReactNode;
  if (!isWide) {
    // Phones and iPhone Duo's cover panel: one column, picture above the words.
    body = (
      <>
        {current.title}
        {current.visual}
        {current.copy}
        {!pinActions && current.actions}
      </>
    );
  } else if (split) {
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
        {!pinActions && current.actions}
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
      {pinActions && (
        // The same column as the step above it, so the buttons line up with
        // the words and move beside the fold with them when half-open.
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, layout.screenMargin) },
            isWide ? contentColumnWide : [contentColumn, besideFold],
          ]}>
          {isWide ? (
            <View style={[styles.narrowColumn, besideFold ?? styles.centred]}>
              {current.actions}
            </View>
          ) : (
            current.actions
          )}
        </View>
      )}
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
  // Pinned actions: the step's side margins and gap. The first action's own
  // top margin separates it from the scrolling step.
  footer: { paddingHorizontal: layout.screenMargin, gap: spacing.lg },
  narrowColumn: { width: '100%', maxWidth: 520, gap: spacing.lg },
  centred: { alignSelf: 'center' },
  mark: { fontSize: 64 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  hint: { fontSize: 13, lineHeight: 19 },
  primary: {
    marginTop: spacing.xl,
  },
  // A 44pt target in the 32pt the text row took: it reaches 6pt into the
  // gaps around it, so a step with three of these is no taller.
  quiet: { marginVertical: -6 },
  quietLabel: { textAlign: 'center' },

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
