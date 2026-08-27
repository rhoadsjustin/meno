/**
 * First-launch onboarding (docs/08 M6): the thesis, the notification
 * opt-in ("Can we quiz you out of the blue?"), a widget hint, then straight
 * into the first goal. Skippable at every step, never guilt (06 §6).
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markOnboardingDone } from '@/services/db/repos/appFlags';
import { setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Step = 'welcome' | 'notifications' | 'widget';

export default function OnboardingRoute() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');

  const finish = useCallback(
    async (openWizard: boolean) => {
      await markOnboardingDone();
      router.back();
      if (openWizard) router.push('/goal-wizard');
    },
    []
  );

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
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Add the Meno widget to your home screen — it shows your current verse all day, and
              dissolves it as you learn. Long-press the home screen → tap your name or Edit → Add
              Widget → Meno.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void finish(true)}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Pick your first passage</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void finish(false)}>
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
  primary: {
    marginTop: spacing.xl,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  quiet: { fontSize: 15, textAlign: 'center', marginTop: spacing.md },
});
