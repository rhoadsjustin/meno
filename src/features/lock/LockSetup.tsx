/**
 * Lock setup flow (docs/04 §5): explainer → Screen Time authorization →
 * native app picker → mode + override style → done. Only reachable on a
 * physical iOS device with the native module present.
 */
import { SymbolView } from 'expo-symbols';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { TextLink } from '@/components/text-link';
import { useTranslation } from '@/i18n/react';
import { loadLockConfig, saveLockConfig } from '@/services/db/repos/lock';
import {
  configureShield,
  getAuthorizationStatus,
  getLockModule,
  isLockAvailable,
  killSwitch,
  LOCK_SELECTION_ID,
  onAuthStatusChange,
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
  const { t } = useTranslation(['lock', 'common']);
  const { sides } = useContentLayout();
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
    const status = await requestAuthorization();
    setAuthStatus(status);
    setBusy(false);
    if (status === 'approved') setStep('pick');
  }, []);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      // The shield's "Recite to unlock" bounce arrives as a tappable
      // notification, so notification permission is part of setup.
      await Notifications.requestPermissionsAsync();
      // Shield copy reflects the current verse (04 §3).
      const goal = await activeGoal();
      let reference = 'Meno';
      let verseText: string | null = null;
      if (goal) {
        const chunk = await currentChunk(goal.id);
        if (chunk) {
          const range = {
            start: {
              bookId: chunk.startBookId,
              chapter: chunk.startChapter,
              verse: chunk.startVerse,
            },
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

  // Every step has a native way out: the bar's back chevron, which on iPhone
  // Duo moves to the side with the status bar. The steps carry their own
  // headings, so the bar has no title.
  const header = <ScreenHeader title="" />;

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
            <Button
              label={t('common:continue')}
              onPress={() => setStep(authStatus === 'approved' ? 'pick' : 'authorize')}
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
              {authStatus === 'denied' ? t('setup.authDenied') : t('setup.authBody')}
            </Text>
            <Button
              label={authStatus === 'denied' ? t('common:retry') : t('setup.grantPermission')}
              disabled={busy}
              onPress={() => void authorize()}
              style={styles.primary}
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
            <Button
              label={t('setup.turnOn')}
              disabled={busy}
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
              {t('setup.doneBody')}
            </Text>
            <Button label={t('common:done')} onPress={closeModal} style={styles.primary} />
          </>
        )}

        {step !== 'done' && step !== 'explainer' && (
          <TextLink
            tone="quiet"
            label={t('setup.cancelSetup')}
            onPress={() => {
              killSwitch();
              void saveLockConfig({ enabled: false });
              closeModal();
            }}
            style={styles.cancel}
            labelStyle={styles.cancelLabel}
          />
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
  // The 44pt target supplies 12pt of the 20pt the text used to sit below.
  cancel: { marginTop: spacing.sm },
  cancelLabel: { textAlign: 'center' },
});
