/**
 * First-launch onboarding (docs/08 M6): the thesis, the notification
 * opt-in ("Can we quiz you out of the blue?"), a visual tour of the widget
 * (Home + Lock Screen) and recite-to-unlock, then straight into the first
 * goal. Skippable at every step, never guilt (06 §6).
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markOnboardingDone } from '@/services/db/repos/appFlags';
import { isLockAvailable } from '@/services/lock';
import { setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Step = 'welcome' | 'notifications' | 'widget' | 'lock';

export default function OnboardingRoute() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');

  const finish = useCallback(async (then?: 'goal-wizard' | 'lock-setup') => {
    await markOnboardingDone();
    router.back();
    if (then) router.push(`/${then}`);
  }, []);

  const optIn = useCallback(async () => {
    await setNotificationsEnabled(true);
    setStep('widget');
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
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
              That’s the secret sauce. Up to two surprise pop quizzes a day, only between 9am and
              9pm — each takes about 30 seconds and keeps memorized verses from fading.
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

        {step === 'widget' && (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Keep it in front of you
            </Text>
            <View
              style={styles.mockRow}
              accessible
              accessibilityLabel="Preview: a Home Screen widget showing your current verse, and a Lock Screen line showing its reference">
              <HomeWidgetMock />
              <LockScreenMock />
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
              onPress={() => void finish('goal-wizard')}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
                Pick your first passage
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
 * Feature mocks: quiet typographic previews, not screenshots (07 §5).
 * Verse text in them is WEB (public domain), so bundling it here is fine.
 */
function HomeWidgetMock() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.widgetMock,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.separator },
      ]}>
      <Text
        numberOfLines={3}
        style={[styles.widgetMockVerse, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        Rejoice in the Lord always.
      </Text>
      <Text style={[styles.widgetMockRef, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        Philippians 4:4
      </Text>
    </View>
  );
}

function LockScreenMock() {
  // A Lock Screen is dark in both themes — painted explicitly, not themed.
  const colors = useThemeColors();
  return (
    <View style={[styles.lockScreenMock, { borderColor: colors.separator }]}>
      <Text style={[styles.lockScreenClock, { fontFamily: fonts?.ui }]}>9:41</Text>
      <Text numberOfLines={1} style={[styles.lockScreenLine, { fontFamily: fonts?.ui }]}>
        M · Philippians 4:4
      </Text>
    </View>
  );
}

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
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  quiet: { fontSize: 15, textAlign: 'center', marginTop: spacing.md },

  mockRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.sm },
  widgetMock: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 150,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  widgetMockVerse: { fontSize: 16, lineHeight: 21 },
  widgetMockRef: { fontSize: 11 },
  lockScreenMock: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 150,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#101418',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  lockScreenClock: { color: '#F2F4F7', fontSize: 34, fontWeight: '300', letterSpacing: 1 },
  lockScreenLine: { color: '#C7CCD4', fontSize: 12 },
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
