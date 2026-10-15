/**
 * First-launch onboarding (docs/08 M6): the thesis, the notification
 * opt-in ("Can we quiz you out of the blue?"), a visual tour of the widget
 * (Home + Lock Screen) and recite-to-unlock, then straight into practicing
 * a first verse. Skippable at every step, never guilt (06 §6).
 */
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { HomeWidgetShot, LockScreenShot } from '@/components/feature-captures';
import { DEFAULT_STARTER, formatRange } from '@/services/bible';
import { markOnboardingDone } from '@/services/db/repos/appFlags';
import { startStarterGoal } from '@/services/db/repos/goals';
import { isLockAvailable } from '@/services/lock';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import { setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

/** `notificationsBlocked`: said yes in Meno, then no to the iOS prompt. */
type Step = 'welcome' | 'notifications' | 'notificationsBlocked' | 'widget' | 'lock';

export default function OnboardingRoute() {
  const colors = useThemeColors();
  const { insets, sides } = useContentLayout();
  const [chosenStep, setStep] = useState<Step>('welcome');
  // Back from iPhone Settings with notifications allowed: nothing left to
  // say on the blocked step, so carry on.
  const reminders = useReminderStatus();
  const step: Step =
    chosenStep === 'notificationsBlocked' && reminders?.overall === 'on' ? 'widget' : chosenStep;

  const finish = useCallback(async (then?: 'goal-wizard' | 'lock-setup') => {
    await markOnboardingDone();
    router.back();
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

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
        {step === 'welcome' && (
          <>
            <Text style={[styles.mark, { color: colors.lapis, fontFamily: fonts?.scripture }]}>M</Text>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              Let the Word remain in you.
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Meno helps you hide Scripture in your heart. Pick a passage, climb from reading it to
              reciting it, and keep it fresh for good — a few minutes a day.
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              As a verse solidifies in memory, its text dissolves from the screen. That’s the idea:
              it lives in you, not the app.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('notifications')}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 'notifications' && (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Can we quiz you out of the blue?
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              That’s the secret sauce. A daily nudge to practice, then surprise pop quizzes on the
              verses you’ve memorized — never more than two a day, and each takes about 30 seconds.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void optIn()}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Yes, quiz me</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setStep('widget')}>
              <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Later
              </Text>
            </Pressable>
          </>
        )}

        {step === 'notificationsBlocked' && (
          <>
            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Reminders can’t reach you yet
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Your iPhone isn’t allowing notifications from Meno, so no reminders or quizzes will
              arrive. To let them through, open iPhone Settings, tap Notifications, and turn on
              Allow Notifications.
            </Text>
            <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Not now is fine too. Settings → Reminders in Meno always shows whether they’re
              getting through.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
                Open iPhone Settings
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setStep('widget')}>
              <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Not now
              </Text>
            </Pressable>
          </>
        )}

        {step === 'widget' && (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Keep it in front of you
            </Text>
            <View
              style={styles.shotStack}
              accessible
              accessibilityLabel="Preview: Meno’s Home Screen widget showing Philippians 4:4 with half its words blanked out, and its Lock Screen widget under the clock">
              <HomeWidgetShot />
              <LockScreenShot />
            </View>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Meno’s widgets put your current verse on the Home Screen and under the clock on your
              Lock Screen — it follows you all day, and dissolves as you learn it.
            </Text>
            <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Home Screen: long-press → Edit → Add Widget → Meno.{'\n'}
              Lock Screen: long-press the clock → Customize → add Meno.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('lock')}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 'lock' && (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Open your apps by heart
            </Text>
            <View
              accessible
              accessibilityLabel="Preview: a shielded app asking you to recite your verse before it opens, with an Override button that always works">
              <ShieldMock />
            </View>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Optional, and a little audacious: shield the apps that eat your time. To open one,
              recite your current verse from memory. Override is always there — you’re never locked
              out of your own phone.
            </Text>
            {!isLockAvailable() && (
              <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Works on your iPhone (not in the simulator). Find it anytime in Settings → Recite to
                Unlock.
              </Text>
            )}
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
                Try it with {formatRange(DEFAULT_STARTER.range)}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void finish('goal-wizard')}>
              <Text style={[styles.quiet, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                Choose my own passage
              </Text>
            </Pressable>
            {isLockAvailable() && (
              <Pressable accessibilityRole="button" onPress={() => void finish('lock-setup')}>
                <Text style={[styles.quiet, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                  Set up recite-to-unlock
                </Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={() => void finish()}>
              <Text style={[styles.quiet, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Explore first
              </Text>
            </Pressable>
          </>
        )}
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
  return (
    <View style={[styles.shieldMock, { borderColor: colors.separator }]}>
      <Text style={[styles.shieldMockApp, { fontFamily: fonts?.ui }]}>This app is shielded</Text>
      <Text style={[styles.shieldMockVerse, { fontFamily: fonts?.scripture }]}>
        Philippians 4:4 — from memory
      </Text>
      <View style={styles.shieldMockButtons}>
        <View style={[styles.shieldMockPill, { backgroundColor: colors.lapis }]}>
          <Text style={[styles.shieldMockPillText, { fontFamily: fonts?.ui }]}>
            Recite to unlock
          </Text>
        </View>
        <Text style={[styles.shieldMockOverride, { fontFamily: fonts?.ui }]}>Override</Text>
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
