/**
 * Lock setup flow (docs/04 §5): explainer → Screen Time authorization →
 * native app picker → mode → done. Only reachable on a physical iOS device
 * with the native module present.
 *
 * The explainer is the message before Apple's permission request, so it
 * follows App Review 5.1.1(iv): one button, "Continue", which opens the
 * system request, and no way to leave the message without seeing it. The
 * choice is made in Apple's dialog. A decline lands on its own step, which
 * offers Try again and iPhone Settings and can be left.
 *
 * Setup is also how a running lock is edited (Settings pushes it either
 * way), so nothing here turns the lock off: Back and the bar's back button
 * only move or leave. Turning it off is the one explicit control in
 * Settings, "Turn off and clear all shields now" (04 §6).
 */
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SymbolView } from 'expo-symbols';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Stack } from 'expo-router';
import { TextLink } from '@/components/text-link';
import { useTranslation } from '@/i18n/react';
import { loadLockConfig, saveLockConfig } from '@/services/db/repos/lock';
import {
  applyLockMode,
  configureShield,
  getAuthorizationStatus,
  getLockModule,
  isLockAvailable,
  LOCK_SELECTION_ID,
  onAuthStatusChange,
  requestAuthorization,
  type LockAuthStatus,
} from '@/services/lock';
import {
  previousStep,
  RELOCK_CHOICES,
  relockChoice,
  type LockMode,
  type SetupStep,
} from '@/services/lock/setup-flow';
import { activeGoal, currentChunk } from '@/services/db/repos/goals';
import { formatRange, getPassage } from '@/services/bible';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

export function LockSetup() {
  const colors = useThemeColors();
  const { t } = useTranslation(['lock', 'common']);
  const { sides } = useContentLayout();
  const [step, setStep] = useState<SetupStep>('explainer');
  const [authStatus, setAuthStatus] = useState<LockAuthStatus>('notDetermined');
  const [hasSelection, setHasSelection] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState<LockMode>('firstPickup');
  const [relockMinutes, setRelockMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  // Whether the shield's notification can arrive; asked for by Turn on.
  const [notificationsAllowed, setNotificationsAllowed] = useState(true);
  const [turnOnFailed, setTurnOnFailed] = useState(false);

  const available = isLockAvailable();
  const mod = getLockModule();

  useEffect(() => {
    void getAuthorizationStatus().then(setAuthStatus);
    void loadLockConfig().then((c) => {
      setMode(c.mode);
      setRelockMinutes(relockChoice(c.relockMinutes));
      setHasSelection(c.activitySelectionToken != null);
    });
    // The grant dialog is a system sheet; catch the status whichever way it
    // lands — live event, or a re-read when the app foregrounds again — and
    // advance past the auth step as soon as it's approved.
    const applyStatus = (status: LockAuthStatus) => {
      setAuthStatus(status);
      if (status === 'approved') setStep((s) => (s === 'authorize' ? 'pick' : s));
    };
    const statusSub = onAuthStatusChange(applyStatus);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getAuthorizationStatus().then(applyStatus);
    });
    return () => {
      statusSub.remove();
      appStateSub.remove();
    };
  }, []);

  const authorize = useCallback(async () => {
    setBusy(true);
    try {
      let status: LockAuthStatus;
      try {
        status = await requestAuthorization();
      } catch {
        // The request itself failed (the system throws on a decline in some
        // versions). Read where that left things; anything short of approved
        // is shown as declined, with Try again and iPhone Settings on offer.
        status = await getAuthorizationStatus().catch(() => 'denied' as const);
        if (status !== 'approved') status = 'denied';
      }
      setAuthStatus(status);
      // A decline gets its own step: what happened, Try again, Settings.
      setStep(status === 'approved' ? 'pick' : 'authorize');
    } finally {
      // Whatever happened, the button comes back.
      setBusy(false);
    }
  }, []);

  const finish = useCallback(async () => {
    setBusy(true);
    setTurnOnFailed(false);
    try {
      // The shield's "Recite to unlock" bounce arrives as a tappable
      // notification, so notification permission is part of setup. The step
      // says so above the button; a refusal is not a failure, the done step
      // explains what to do without it.
      let allowed = false;
      try {
        allowed = (await Notifications.requestPermissionsAsync()).granted;
      } catch {}
      setNotificationsAllowed(allowed);

      // Shield copy reflects the current verse (04 §3). Best-effort: a verse
      // that will not load must not stop the lock from turning on, and the
      // shield is re-published on every foreground.
      let reference = 'Meno';
      let verseText: string | null = null;
      try {
        const goal = await activeGoal();
        const chunk = goal ? await currentChunk(goal.id) : null;
        if (goal && chunk) {
          const range = {
            start: {
              bookId: chunk.startBookId,
              chapter: chunk.startChapter,
              verse: chunk.startVerse,
            },
            end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
          };
          const verses = await getPassage(goal.translationId, range);
          reference = formatRange(range);
          verseText = verses.map((v) => v.text).join(' ');
        }
      } catch {}
      configureShield(reference, verseText);

      await saveLockConfig({ enabled: true, mode, relockMinutes });
      // Stops the previous mode's schedule before starting this one.
      await applyLockMode(mode);

      setStep('done');
    } catch (e) {
      if (__DEV__) console.warn('Lock setup failed', e);
      setTurnOnFailed(true);
    } finally {
      setBusy(false);
    }
  }, [mode, relockMinutes]);

  // The steps have a native way out: the bar's back chevron, which on iPhone
  // Duo moves to the side with the status bar. The one exception is the
  // explainer while permission is still to be asked: a message shown before
  // a permission request must lead to the request (App Review 5.1.1(iv)), so
  // it has no back button and no swipe back. The steps carry their own
  // headings, so the bar has no title.
  const leadsToRequest = available && step === 'explainer' && authStatus !== 'approved';
  const header = (
    <>
      <Stack.Screen options={{ gestureEnabled: !leadsToRequest }} />
      <ScreenHeader title="" backHidden={leadsToRequest} />
    </>
  );
  const back = previousStep(step);

  if (!available) {
    return (
      <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
        {header}
        <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {t('setup.unavailableTitle')}
          </Text>
          <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('setup.unavailableBody')}
          </Text>
          <Button label={t('common:back')} onPress={closeModal} style={styles.primary} />
        </ScrollView>
      </View>
    );
  }

  const SheetPicker = mod?.DeviceActivitySelectionSheetViewPersisted;

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
        {step === 'explainer' && (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('setup.explainerTitle')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.explainerBody')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.explainerPrivacy')}
            </Text>
            {/* Straight to Apple's request, with nothing in between. The
                system sheet can take a while to answer: a spinner, not a
                dimmed button. */}
            <Button
              label={t('common:continue')}
              busy={busy}
              onPress={() => (authStatus === 'approved' ? setStep('pick') : void authorize())}
              style={styles.primary}
            />
          </>
        )}

        {step === 'authorize' && (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('setup.authTitle')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.authDenied')}
            </Text>
            <Button
              label={t('common:retry')}
              busy={busy}
              onPress={() => void authorize()}
              style={styles.primary}
            />
            <Button
              variant="secondary"
              label={t('setup.openSettings')}
              onPress={() => void Linking.openSettings()}
            />
          </>
        )}

        {step === 'pick' && (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('setup.pickTitle')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.pickBody')}
            </Text>
            <Button
              label={hasSelection ? t('setup.changeApps') : t('setup.pickApps')}
              onPress={() => setPickerVisible(true)}
              style={styles.primary}
            />
            {hasSelection && (
              <Button
                variant="secondary"
                label={t('common:continue')}
                onPress={() => setStep('configure')}
              />
            )}
            {pickerVisible && SheetPicker && (
              <SheetPicker
                style={{ width: 1, height: 1, position: 'absolute' }}
                familyActivitySelectionId={LOCK_SELECTION_ID}
                onDismissRequest={() => setPickerVisible(false)}
                onSelectionChange={(event) => {
                  const m = event.nativeEvent;
                  const anySelected = m.applicationCount + m.categoryCount + m.webDomainCount > 0;
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
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('setup.configureTitle')}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {(
                [
                  ['firstPickup', t('setup.modeFirstPickup'), t('setup.modeFirstPickupDetail')],
                  [
                    'everyPickup',
                    t('setup.modeEveryPickup'),
                    t('setup.modeEveryPickupDetail', { count: relockMinutes }),
                  ],
                  ['schedule', t('setup.modeSchedule'), t('setup.modeScheduleDetail')],
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
                    <View style={styles.optionText}>
                      <Text
                        style={[styles.optionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                        {label}
                      </Text>
                      <Text
                        style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                        {sub}
                      </Text>
                    </View>
                    {/* The choice is marked by more than its tint (07 §6, never
                      colour alone). The slot is always there so the text does
                      not re-wrap as the mark moves; the selected state already
                      tells VoiceOver. */}
                    <View style={styles.optionMark}>
                      {selected && (
                        <SymbolView
                          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                          tintColor={colors.lapis}
                          size={18}
                          weight="semibold"
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {mode === 'everyPickup' && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.ink, fontFamily: fonts?.ui }]}>
                  {t('setup.relockLabel')}
                </Text>
                <SegmentedControl
                  values={RELOCK_CHOICES.map((m) => t('setup.relockOption', { count: m }))}
                  selectedIndex={RELOCK_CHOICES.findIndex((m) => m === relockMinutes)}
                  onChange={(e) => {
                    const minutes = RELOCK_CHOICES[e.nativeEvent.selectedSegmentIndex];
                    if (minutes) setRelockMinutes(minutes);
                  }}
                />
              </View>
            )}
            {/* Said before the system asks (the request is in Turn on). */}
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.notificationNote')}
            </Text>
            {turnOnFailed && (
              <Text
                accessibilityRole="alert"
                style={[styles.body, { color: colors.error, fontFamily: fonts?.ui }]}>
                {t('setup.turnOnFailed')}
              </Text>
            )}
            <Button
              label={t('setup.turnOn')}
              busy={busy}
              onPress={() => void finish()}
              style={styles.primary}
            />
          </>
        )}

        {step === 'done' && (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.gold, fontFamily: fonts?.ui }]}>
              {t('setup.doneTitle')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {mode === 'firstPickup'
                ? t('setup.doneFirstPickup')
                : mode === 'everyPickup'
                  ? t('setup.doneEveryPickup', { count: relockMinutes })
                  : t('setup.doneSchedule')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {notificationsAllowed ? t('setup.doneNotification') : t('setup.doneNoNotification')}
            </Text>
            <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('setup.doneEscape')}
            </Text>
            <Button label={t('common:done')} onPress={closeModal} style={styles.primary} />
            {!notificationsAllowed && (
              <Button
                variant="secondary"
                label={t('setup.openSettings')}
                onPress={() => void Linking.openSettings()}
              />
            )}
          </>
        )}

        {/* Back is the previous step; leaving is the bar's back button and
            changes nothing. A lock that is already on stays on (04 §6: it is
            turned off in Settings, by name). */}
        {back && (
          <View style={styles.exits}>
            <TextLink tone="quiet" label={t('common:back')} onPress={() => setStep(back)} />
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  options: { gap: spacing.lg },
  optionText: { flex: 1, gap: spacing.xs },
  optionMark: { width: 18, alignItems: 'center' },
  optionTitle: { fontSize: 17, fontWeight: '600' },
  primary: { marginTop: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  exits: { alignItems: 'center', marginTop: spacing.sm },
});
