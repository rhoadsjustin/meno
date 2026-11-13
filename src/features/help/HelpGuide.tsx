/**
 * "How to set up Meno": a plain-language guide to every feature that needs
 * something outside the app — iOS permissions, widgets, Screen Time — written
 * for people who don't live in Settings.
 *
 * Sections show live status where the app can read it (reminders, the
 * microphone permission, the lock config) with a one-tap fix: ask for the
 * permission, or open iPhone Settings once iOS won't ask again. iOS doesn't
 * let apps see which widgets are placed, so the widget sections are numbered
 * steps beside a real capture. Common questions close the guide.
 *
 * Rendered whole by the Help modal, and in part by Settings' detail pane on
 * wide windows (iPhone Duo opened), where each row shows its own section.
 */
import { router } from 'expo-router';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { HomeWidgetShot, LockScreenShot } from '@/components/feature-captures';
import { Button } from '@/components/button';
import { Symbol } from '@/components/symbol';
import { useTranslation } from '@/i18n/react';
import { formatRef } from '@/services/bible';
import { loadLockConfig } from '@/services/db/repos/lock';
import { getAuthorizationStatus, isLockAvailable } from '@/services/lock';
import { ReminderStatusList } from '@/features/reminders/ReminderStatusList';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import {
  reminderSummary,
  setNotificationsEnabled,
  type ReminderStatus,
} from '@/services/notifications';
import { useThemeColors, fonts, spacing, textStyle } from '@/theme';

export type SectionKey = 'quizzes' | 'homeWidget' | 'lockWidget' | 'speak' | 'lock';

/**
 * What the app can tell about a feature. `openSettings`: permission was
 * declined and iOS won't ask again. `manual`: iOS doesn't let apps check.
 */
type Status = 'ready' | 'notYet' | 'openSettings' | 'unavailable' | 'manual';
type Statuses = Record<SectionKey, Status>;

const SECTIONS: SectionKey[] = ['quizzes', 'homeWidget', 'lockWidget', 'speak', 'lock'];

/** The verse the widget captures show. */
const CAPTURE_REF = { bookId: 'Phil', chapter: 4, verse: 4 };

const INITIAL: Statuses = {
  quizzes: 'notYet',
  homeWidget: 'manual',
  lockWidget: 'manual',
  speak: 'notYet',
  lock: 'notYet',
};

/** Granted → ready; declined for good → iPhone Settings. */
function permissionStatus(perm: { granted: boolean; canAskAgain: boolean }): Status {
  if (perm.granted) return 'ready';
  return perm.canAskAgain ? 'notYet' : 'openSettings';
}

/**
 * The reminders section's status, from the same source Settings and Today
 * read (services/notifications/status), so the three always agree.
 */
function remindersStatus(reminders: ReminderStatus | null): Status {
  if (!reminders || reminders.overall === 'off') return 'notYet';
  if (reminders.overall === 'blocked') return reminders.canAsk ? 'notYet' : 'openSettings';
  return 'ready';
}

/** Everything but reminders, which `useReminderStatus` keeps live. */
async function readStatuses(): Promise<Statuses> {
  const [micPerm, lock, auth] = await Promise.all([
    ExpoSpeechRecognitionModule.getPermissionsAsync(),
    loadLockConfig(),
    getAuthorizationStatus(),
  ]);
  return {
    quizzes: 'notYet',
    homeWidget: 'manual',
    lockWidget: 'manual',
    speak: permissionStatus(micPerm),
    lock: !isLockAvailable()
      ? 'unavailable'
      : lock.enabled && auth === 'approved'
        ? 'ready'
        : 'notYet',
  };
}

/** Common questions, in order; each is `faq.<id>.q` / `faq.<id>.a` in the help catalog. */
const FAQ = [
  'multiple',
  'widgetVerse',
  'oldVerse',
  'referenceOnly',
  'noReminders',
  'shielded',
  'voice',
  'deleteApp',
] as const;

/**
 * What Android can show: no Meno widget yet and no Screen Time, so those
 * sections and the questions about them stay out, even when a link asks
 * for one.
 */
const ANDROID_HIDDEN = new Set<SectionKey | (typeof FAQ)[number]>([
  'homeWidget',
  'lockWidget',
  'lock',
  'widgetVerse',
  'oldVerse',
  'referenceOnly',
  'shielded',
]);
const onPlatform = (key: SectionKey | (typeof FAQ)[number]) =>
  Platform.OS === 'ios' || !ANDROID_HIDDEN.has(key);

export type HelpGuideProps = {
  /** Which sections to show; all by default. */
  sections?: SectionKey[];
  /** The status checklist. With `scrollTo` its rows are buttons that jump to
   * each section; without it they are plain status rows. */
  overview?: boolean;
  /** The common-questions card. */
  faq?: boolean;
  /** Scrolls the host to a content offset; the overview rows use it. */
  scrollTo?: (y: number) => void;
  /** Runs before the guide pushes another route (the Help modal closes itself first). */
  onBeforeNavigate?: () => void;
  /**
   * Settings' detail pane sits beside the reminders row, which already has
   * the switch, each reminder's status and the way to allow notifications.
   * The reminders section then only explains: no status under its title, no
   * per-reminder lines and no button repeating the row's switch.
   */
  remindersBeside?: boolean;
};

export function HelpGuide({
  sections = SECTIONS,
  overview = true,
  faq = true,
  scrollTo,
  onBeforeNavigate,
  remindersBeside = false,
}: HelpGuideProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('help');
  const rootY = useRef(0);
  const offsets = useRef<Partial<Record<SectionKey, number>>>({});
  const [rest, setStatuses] = useState<Statuses>(INITIAL);
  const reminders = useReminderStatus();
  const statuses: Statuses = { ...rest, quizzes: remindersStatus(reminders) };
  // The checklist says more than "Ready" for reminders: off, blocked, or when
  // the next one comes.
  const statusLabel = (key: SectionKey) =>
    key === 'quizzes' && reminders
      ? reminderSummary(reminders, { now: new Date() })
      : t(`status.${statuses[key]}`);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const shown = new Set(sections.filter(onPlatform));

  const refresh = useCallback(async () => {
    try {
      setStatuses(await readStatuses());
    } catch {
      // Keep the last known statuses; the steps below still apply.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await readStatuses();
        if (!cancelled) setStatuses(next);
      } catch {
        // Defaults stay; the steps below still apply.
      }
    })();
    // Coming back from iPhone Settings: re-read so the checklist updates itself.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refresh]);

  const turnOnQuizzes = useCallback(async () => {
    await setNotificationsEnabled(true);
  }, []);

  const allowMicrophone = useCallback(async () => {
    await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    await refresh();
  }, [refresh]);

  const openLockSetup = useCallback(() => {
    onBeforeNavigate?.();
    router.push('/lock-setup');
  }, [onBeforeNavigate]);

  const openIphoneSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const jumpTo = useCallback(
    (key: SectionKey) => {
      const y = offsets.current[key];
      if (y == null || !scrollTo) return;
      scrollTo(Math.max(0, rootY.current + y - spacing.md));
    },
    [scrollTo],
  );

  const recordOffset = useCallback((key: SectionKey, e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  }, []);

  const text = { color: colors.ink, fontFamily: fonts?.ui };
  const faint = { color: colors.inkFaint, fontFamily: fonts?.ui };

  return (
    <View style={styles.guide} onLayout={(e) => (rootY.current = e.nativeEvent.layout.y)}>
      {overview && (
        <Card>
          {SECTIONS.filter((key) => shown.has(key)).map((key, i) => {
            const label = t('overviewLabel', {
              title: t(`sections.${key}`),
              status: statusLabel(key),
            });
            const rowStyle = [
              styles.overviewRow,
              i > 0 && {
                borderTopColor: colors.separator,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ];
            const row = (
              <>
                <Text style={[styles.overviewTitle, text]}>{t(`sections.${key}`)}</Text>
                <StatusText status={statuses[key]} label={statusLabel(key)} />
              </>
            );
            // Only a host that can scroll makes these buttons: a row that
            // says "Shows the steps" and does nothing is worse than a status.
            return scrollTo ? (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={t('overviewHint')}
                onPress={() => jumpTo(key)}
                style={rowStyle}>
                {row}
              </Pressable>
            ) : (
              <View key={key} accessible accessibilityLabel={label} style={rowStyle}>
                {row}
              </View>
            );
          })}
        </Card>
      )}

      {shown.has('quizzes') && (
        <Section
          sectionKey="quizzes"
          title={t('sections.quizzes')}
          status={statuses.quizzes}
          statusLabel={statusLabel('quizzes')}
          showStatus={!remindersBeside}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>{t('quizzes.body')}</Text>
          {reminders?.overall === 'blocked' && (
            <Text style={[styles.tip, { color: colors.error, fontFamily: fonts?.ui }]}>
              {t('quizzes.blocked')}
            </Text>
          )}
          {statuses.quizzes === 'openSettings' ? (
            <>
              <Steps
                items={[
                  t('steps.tapOpenSettings'),
                  t('quizzes.tapNotifications'),
                  t('quizzes.allowNotifications'),
                  t('steps.comeBack'),
                ]}
              />
              {/* Kept beside Settings' row too: the first step points at it. */}
              <Button label={t('actions.openIphoneSettings')} onPress={openIphoneSettings} />
            </>
          ) : statuses.quizzes === 'ready' ? (
            <>
              {!remindersBeside && reminders && <ReminderStatusList status={reminders} />}
              <Text style={[styles.tip, faint]}>{t('quizzes.readyTip')}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.tip, faint]}>
                {reminders?.overall === 'off' ? t('quizzes.offTip') : t('quizzes.askTip')}
              </Text>
              {!remindersBeside && (
                <Button
                  label={
                    reminders?.canAsk
                      ? t('actions.allowNotifications')
                      : t('actions.turnOnReminders')
                  }
                  onPress={() => void turnOnQuizzes()}
                />
              )}
            </>
          )}
        </Section>
      )}

      {shown.has('homeWidget') && (
        <Section
          sectionKey="homeWidget"
          title={t('sections.homeWidget')}
          status={statuses.homeWidget}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>{t('homeWidget.body')}</Text>
          <HomeWidgetShot
            accessibilityLabel={t('homeWidget.imageLabel', { ref: formatRef(CAPTURE_REF) })}
          />
          <Steps
            items={[
              t('homeWidget.steps.goHome'),
              t('homeWidget.steps.holdEmpty'),
              t('homeWidget.steps.tapEdit'),
              t('homeWidget.steps.search'),
              t('homeWidget.steps.pickSize'),
              t('homeWidget.steps.tapDone'),
            ]}
          />
          <Text style={[styles.tip, faint]}>{t('homeWidget.tip')}</Text>
        </Section>
      )}

      {shown.has('lockWidget') && (
        <Section
          sectionKey="lockWidget"
          title={t('sections.lockWidget')}
          status={statuses.lockWidget}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>{t('lockWidget.body')}</Text>
          <LockScreenShot
            accessibilityLabel={t('lockWidget.imageLabel', { ref: formatRef(CAPTURE_REF) })}
          />
          <Steps
            items={[
              t('lockWidget.steps.wake'),
              t('lockWidget.steps.hold'),
              t('lockWidget.steps.customize'),
              t('lockWidget.steps.widgetArea'),
              t('lockWidget.steps.addMeno'),
              t('lockWidget.steps.done'),
            ]}
          />
          <Text style={[styles.tip, faint]}>{t('lockWidget.tip')}</Text>
        </Section>
      )}

      {shown.has('speak') && (
        <Section
          sectionKey="speak"
          title={t('sections.speak')}
          status={statuses.speak}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>{t('speak.body')}</Text>
          {statuses.speak === 'openSettings' ? (
            <>
              <Steps items={[t('steps.tapOpenSettings'), t('speak.turnOn'), t('steps.comeBack')]} />
              <Button label={t('actions.openIphoneSettings')} onPress={openIphoneSettings} />
            </>
          ) : statuses.speak === 'ready' ? (
            <Text style={[styles.tip, faint]}>{t('speak.readyTip')}</Text>
          ) : (
            <>
              <Text style={[styles.tip, faint]}>{t('speak.askTip')}</Text>
              <Button label={t('actions.allowMicrophone')} onPress={() => void allowMicrophone()} />
            </>
          )}
        </Section>
      )}

      {shown.has('lock') && (
        <Section
          sectionKey="lock"
          title={t('sections.lock')}
          status={statuses.lock}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>{t('lock.body')}</Text>
          {statuses.lock === 'unavailable' ? (
            <Text style={[styles.tip, faint]}>{t('lock.unavailable')}</Text>
          ) : statuses.lock === 'ready' ? (
            // Settings' wide pane shows only this section for the lock row,
            // so it must lead back into setup once the lock is on.
            <>
              <Text style={[styles.tip, faint]}>{t('lock.readyTip')}</Text>
              <Button
                variant="secondary"
                label={t('actions.changeLock')}
                onPress={openLockSetup}
              />
            </>
          ) : (
            <>
              <Steps
                items={[
                  t('lock.steps.tapSetUp'),
                  t('lock.steps.allowScreenTime'),
                  t('lock.steps.pickApps'),
                  t('lock.steps.chooseWhen'),
                ]}
              />
              <Button label={t('actions.setUpLock')} onPress={openLockSetup} />
            </>
          )}
        </Section>
      )}

      {faq && (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, styles.faqHeading, text]}>
            {t('faqHeading')}
          </Text>
          <Card>
            {FAQ.filter(onPlatform).map((id, i) => {
              const open = openFaq === i;
              return (
                <View
                  key={id}
                  style={
                    i > 0 && {
                      borderTopColor: colors.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    }
                  }>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenFaq(open ? null : i)}
                    style={styles.faqRow}>
                    <Text style={[styles.faqQuestion, text]}>{t(`faq.${id}.q`)}</Text>
                    <Symbol
                      ios={open ? 'chevron.up' : 'chevron.down'}
                      android={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      size={15}
                      weight="semibold"
                      color={colors.lapis}
                    />
                  </Pressable>
                  {open && <Text style={[styles.faqAnswer, faint]}>{t(`faq.${id}.a`)}</Text>}
                </View>
              );
            })}
          </Card>
        </>
      )}
    </View>
  );
}

function Section({
  sectionKey,
  title,
  status,
  statusLabel,
  showStatus = true,
  onSectionLayout,
  children,
}: PropsWithChildren<{
  sectionKey: SectionKey;
  title: string;
  status: Status;
  /** Overrides the stock wording for `status`. */
  statusLabel?: string;
  /** The status line under the title. */
  showStatus?: boolean;
  /** Reports the section's scroll offset so the overview can jump to it. */
  onSectionLayout: (key: SectionKey, e: LayoutChangeEvent) => void;
}>) {
  const colors = useThemeColors();
  return (
    <View onLayout={(e) => onSectionLayout(sectionKey, e)}>
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {title}
          </Text>
          {showStatus && <StatusText status={status} label={statusLabel} />}
        </View>
        {children}
      </Card>
    </View>
  );
}

/** Status is always spelled out, never color alone. */
function StatusText({ status, label }: { status: Status; label?: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation('help');
  const color =
    status === 'ready'
      ? colors.success
      : status === 'openSettings'
        ? colors.error
        : colors.inkFaint;
  const words = (
    <Text style={[styles.status, { color, fontFamily: fonts?.ui }]}>
      {label ?? t(`status.${status}`)}
    </Text>
  );
  if (status !== 'ready' && status !== 'openSettings') return words;
  return (
    <View style={styles.statusRow}>
      {status === 'ready' ? (
        <Symbol ios="checkmark.circle.fill" android="check_circle" size={15} color={color} />
      ) : (
        <Symbol ios="exclamationmark.circle.fill" android="error" size={15} color={color} />
      )}
      {words}
    </View>
  );
}

function Steps({ items }: { items: string[] }) {
  const colors = useThemeColors();
  const { t } = useTranslation('help');
  return (
    <View style={styles.steps}>
      {items.map((item, i) => (
        <View
          key={item}
          style={styles.stepRow}
          accessible
          accessibilityLabel={t('stepLabel', { number: i + 1, text: item })}>
          <Text style={[styles.stepNumber, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {i + 1}.
          </Text>
          <Text style={[styles.stepText, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  guide: { gap: spacing.lg },
  body: { fontSize: 16, lineHeight: 23 },
  tip: { fontSize: 15, lineHeight: 21 },
  overviewRow: { paddingVertical: spacing.sm, gap: 2 },
  overviewTitle: { fontSize: 17, fontWeight: '600' },
  status: { fontSize: 14, lineHeight: 19, fontWeight: '600', flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.md },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { ...textStyle.title3, fontWeight: '600' },
  steps: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.sm },
  stepNumber: { fontSize: 16, lineHeight: 23, fontWeight: '700', minWidth: 22 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 23 },
  faqHeading: { marginTop: spacing.sm },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  faqQuestion: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  faqAnswer: { fontSize: 15, lineHeight: 22, paddingBottom: spacing.md },
});
