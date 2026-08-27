/**
 * Lock setup flow (docs/04 §5): explainer → Screen Time authorization →
 * native app picker → mode + override style → done. Only reachable on a
 * physical iOS device with the native module present.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadLockConfig, saveLockConfig } from '@/services/db/repos/lock';
import {
  configureShield,
  getAuthorizationStatus,
  getLockModule,
  isLockAvailable,
  killSwitch,
  LOCK_SELECTION_ID,
  requestAuthorization,
  startFirstPickupMode,
  startScheduleMode,
  armShields,
  type LockAuthStatus,
} from '@/services/lock';
import { activeGoal, currentChunk } from '@/services/db/repos/goals';
import { formatRange, getPassage } from '@/services/bible';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Step = 'explainer' | 'authorize' | 'pick' | 'configure' | 'done';
type Mode = 'firstPickup' | 'everyPickup' | 'schedule';

export function LockSetup() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('explainer');
  const [authStatus, setAuthStatus] = useState<LockAuthStatus>('notDetermined');
  const [hasSelection, setHasSelection] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('firstPickup');
  const [relockMinutes, setRelockMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  const available = isLockAvailable();
  const mod = getLockModule();

  useEffect(() => {
    void getAuthorizationStatus().then(setAuthStatus);
    void loadLockConfig().then((c) => {
      setMode(c.mode);
      setRelockMinutes(c.relockMinutes ?? 30);
      setHasSelection(c.activitySelectionToken != null);
    });
  }, []);

  const authorize = useCallback(async () => {
    setBusy(true);
    const status = await requestAuthorization();
    setAuthStatus(status);
    setBusy(false);
    if (status === 'approved') setStep('pick');
  }, []);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      // Shield copy reflects the current verse (04 §3).
      const goal = await activeGoal();
      let reference = 'Meno';
      let verseText: string | null = null;
      if (goal) {
        const chunk = await currentChunk(goal.id);
        if (chunk) {
          const range = {
            start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
            end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
          };
          reference = formatRange(range);
          const verses = await getPassage(goal.translationId, range);
          verseText = verses.map((v) => v.text).join(' ');
        }
      }
      configureShield(reference, verseText);

      await saveLockConfig({ enabled: true, mode, relockMinutes });
      if (mode === 'firstPickup') await startFirstPickupMode();
      else if (mode === 'everyPickup') armShields();
      else await startScheduleMode(21, 23); // v1: single evening window

      setStep('done');
    } finally {
      setBusy(false);
    }
  }, [mode, relockMinutes]);

  if (!available) {
    return (
      <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
            Recite to Unlock needs your iPhone
          </Text>
          <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Apple’s Screen Time features only work on a physical device — the simulator can’t
            shield apps. Everything else in Meno works here as usual.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.primary, { backgroundColor: colors.lapis }]}>
            <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Back</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const SheetPicker = mod?.DeviceActivitySelectionSheetViewPersisted;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'explainer' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Recite to unlock
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Choose apps that tend to pull you away. When you open one, Meno asks you to recite
              your current verse first — then gets out of the way.
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Next, iOS will ask for Screen Time permission. Apple never tells Meno which apps you
              pick, and you can override or switch this off at any time.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('authorize')}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 'authorize' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Screen Time permission
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {authStatus === 'denied'
                ? 'Permission was declined. You can grant it in Settings → Screen Time, or try again.'
                : 'Meno uses Apple’s Screen Time to shield the apps you choose.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void authorize()}
              style={[styles.primary, { backgroundColor: colors.lapis, opacity: busy ? 0.6 : 1 }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
                {authStatus === 'denied' ? 'Try again' : 'Grant permission'}
              </Text>
            </Pressable>
          </>
        )}

        {step === 'pick' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Choose apps to shield
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Pick the apps or categories that should ask for a verse first.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerVisible(true)}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>
                {hasSelection ? 'Change apps' : 'Pick apps'}
              </Text>
            </Pressable>
            {hasSelection && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('configure')}
                style={[styles.secondary, { borderColor: colors.lapis }]}>
                <Text style={[styles.secondaryText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                  Continue
                </Text>
              </Pressable>
            )}
            {pickerVisible && SheetPicker && (
              <SheetPicker
                style={{ width: 1, height: 1, position: 'absolute' }}
                familyActivitySelectionId={LOCK_SELECTION_ID}
                onDismissRequest={() => setPickerVisible(false)}
                onSelectionChange={(event) => {
                  const m = event.nativeEvent;
                  const anySelected =
                    m.applicationCount + m.categoryCount + m.webDomainCount > 0;
                  setHasSelection(anySelected);
                  if (anySelected) {
                    // Token lives natively under LOCK_SELECTION_ID; we store
                    // the id as the reference (04 §3).
                    void saveLockConfig({ activitySelectionToken: LOCK_SELECTION_ID });
                  }
                }}
              />
            )}
          </>
        )}

        {step === 'configure' && (
          <>
            <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              When should Meno ask?
            </Text>
            {(
              [
                ['firstPickup', 'First pickup of the day', 'One recitation clears the shields until tomorrow.'],
                ['everyPickup', 'Every pickup', `Shields return ${relockMinutes} minutes after each unlock.`],
                ['schedule', 'Evenings (9–11pm)', 'Shields are up during the evening window.'],
              ] as const
            ).map(([value, label, sub]) => {
              const selected = mode === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setMode(value)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected ? colors.lapisWash : 'transparent',
                      borderColor: selected ? colors.lapis : colors.separator,
                    },
                  ]}>
                  <Text style={[styles.optionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                    {label}
                  </Text>
                  <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void finish()}
              style={[styles.primary, { backgroundColor: colors.lapis, opacity: busy ? 0.6 : 1 }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Turn on</Text>
            </Pressable>
          </>
        )}

        {step === 'done' && (
          <>
            <Text style={[styles.heading, { color: colors.gold, fontFamily: fonts?.ui }]}>
              You’re set
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              The next time you open a shielded app, Meno will ask for your verse. Override is
              always one tap away, and the kill switch in Settings clears everything instantly.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={[styles.primary, { backgroundColor: colors.lapis }]}>
              <Text style={[styles.primaryText, { fontFamily: fonts?.ui }]}>Done</Text>
            </Pressable>
          </>
        )}

        {step !== 'done' && step !== 'explainer' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              killSwitch();
              void saveLockConfig({ enabled: false });
              router.back();
            }}>
            <Text style={[styles.cancel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Cancel setup
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: layout.screenMargin, gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { fontSize: 24, fontWeight: '700', marginTop: spacing.md },
  body: { fontSize: 15, lineHeight: 21 },
  option: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  optionTitle: { fontSize: 17, fontWeight: '600' },
  primary: {
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondary: {
    borderRadius: radius.capsule,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
});
