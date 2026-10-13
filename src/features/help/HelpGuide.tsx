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
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Card } from '@/components/card';
import { HomeWidgetShot, LockScreenShot } from '@/components/feature-captures';
import { loadLockConfig } from '@/services/db/repos/lock';
import { getAuthorizationStatus, isLockAvailable } from '@/services/lock';
import { ReminderStatusList } from '@/features/reminders/ReminderStatusList';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import {
  reminderSummary,
  setNotificationsEnabled,
  type ReminderStatus,
} from '@/services/notifications';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

export type SectionKey = 'quizzes' | 'homeWidget' | 'lockWidget' | 'speak' | 'lock';

/**
 * What the app can tell about a feature. `openSettings`: permission was
 * declined and iOS won't ask again. `manual`: iOS doesn't let apps check.
 */
type Status = 'ready' | 'notYet' | 'openSettings' | 'unavailable' | 'manual';
type Statuses = Record<SectionKey, Status>;

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'quizzes', title: 'Reminders and quizzes' },
  { key: 'homeWidget', title: 'Home Screen widget' },
  { key: 'lockWidget', title: 'Lock Screen widget' },
  { key: 'speak', title: 'Speaking your verse' },
  { key: 'lock', title: 'Recite to unlock' },
];

const STATUS_LABEL: Record<Status, string> = {
  ready: 'Ready',
  notYet: 'Not set up yet',
  openSettings: 'Needs permission in iPhone Settings',
  unavailable: 'Needs a real iPhone',
  manual: 'Add it yourself — steps below',
};

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

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Can I learn more than one passage at a time?',
    a: 'Yes. Tap “+ Practice another passage” on Today (or New goal in Library). Each passage keeps its own progress, and Today lists them all — the one on your widgets at the top.',
  },
  {
    q: 'How do I choose which verse my widgets show?',
    a: 'On Today or in Library, tap “Show on widgets” under the passage you want. Every Meno widget switches to it within a moment, and recite-to-unlock asks for that verse too.',
  },
  {
    q: 'My widget shows an old verse.',
    a: 'Widgets update when you leave Meno. Open Meno, then go back to your Home Screen. Your iPhone can take a few minutes to refresh it.',
  },
  {
    q: 'My widget only shows the reference, not the words.',
    a: 'That’s on purpose once you know a verse well — try reciting it from memory! To show more, touch and hold the widget, tap Edit Widget, and change “Show verse as.”',
  },
  {
    q: 'I’m not getting any reminders or quizzes.',
    a: 'Open Settings → Reminders. Each kind of reminder says when the next one comes, or why none will yet. The daily reminder comes at the time you set and skips a day you’ve already practiced. Quizzes start once a verse is memorized, and only come between 9am and 9pm. If everything there looks right, check your iPhone: a Focus like Sleep or Do Not Disturb holds notifications until it ends, and Scheduled Summary saves them for set times of day. Meno can’t see either one.',
  },
  {
    q: 'An app is shielded and I need it right now.',
    a: 'Tap Override on the shield — it always works. To switch recite-to-unlock off completely, open Meno’s Settings and tap “Turn off and clear all shields now.”',
  },
  {
    q: 'Does Meno record my voice?',
    a: 'No. When you speak a verse, your iPhone turns it into text right on the device. The audio is never saved or sent anywhere.',
  },
  {
    q: 'What happens if I delete Meno?',
    a: 'Your iPhone removes any shields Meno set. Meno doesn’t use an account — your verses and progress live on this iPhone — so deleting the app removes them too.',
  },
];

export type HelpGuideProps = {
  /** Which sections to show; all by default. */
  sections?: SectionKey[];
  /** The status checklist that jumps to each section (needs `scrollTo`). */
  overview?: boolean;
  /** The common-questions card. */
  faq?: boolean;
  /** Scrolls the host to a content offset; the overview rows use it. */
  scrollTo?: (y: number) => void;
  /** Runs before the guide pushes another route (the Help modal closes itself first). */
  onBeforeNavigate?: () => void;
  /** The per-reminder lines; Settings' detail pane leaves them to the row beside it. */
  reminderLines?: boolean;
};

export function HelpGuide({
  sections = SECTIONS.map((s) => s.key),
  overview = true,
  faq = true,
  scrollTo,
  onBeforeNavigate,
  reminderLines = true,
}: HelpGuideProps) {
  const colors = useThemeColors();
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
      : STATUS_LABEL[statuses[key]];
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const shown = new Set(sections);

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
          {SECTIONS.filter((s) => shown.has(s.key)).map(({ key, title }, i) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${statusLabel(key)}`}
              accessibilityHint="Shows the steps"
              onPress={() => jumpTo(key)}
              style={[
                styles.overviewRow,
                i > 0 && {
                  borderTopColor: colors.separator,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}>
              <Text style={[styles.overviewTitle, text]}>{title}</Text>
              <StatusText status={statuses[key]} label={statusLabel(key)} />
            </Pressable>
          ))}
        </Card>
      )}

      {shown.has('quizzes') && (
        <Section
          sectionKey="quizzes"
          title="Reminders and quizzes"
          status={statuses.quizzes}
          statusLabel={statusLabel('quizzes')}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>
            A daily reminder to practice, at a time you choose, and short surprise quizzes on verses
            you’ve memorized (between 9am and 9pm). Never more than two notifications a day.
          </Text>
          {reminders?.overall === 'blocked' && (
            <Text style={[styles.tip, { color: colors.error, fontFamily: fonts?.ui }]}>
              Reminders are on in Meno, but your iPhone isn’t letting them through, so nothing
              can arrive yet.
            </Text>
          )}
          {statuses.quizzes === 'openSettings' ? (
            <>
              <Steps
                items={[
                  'Tap Open iPhone Settings below.',
                  'Tap Notifications.',
                  'Turn on Allow Notifications.',
                  'Come back to Meno — this page updates by itself.',
                ]}
              />
              <Action label="Open iPhone Settings" onPress={openIphoneSettings} />
            </>
          ) : statuses.quizzes === 'ready' ? (
            <>
              {reminderLines && reminders && <ReminderStatusList status={reminders} />}
              <Text style={[styles.tip, faint]}>
                Change the time or turn reminders off in Settings → Reminders. A Focus or
                Scheduled Summary on your iPhone can still hold notifications back; Meno can’t
                see either one.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.tip, faint]}>
                {reminders?.overall === 'off'
                  ? 'Reminders are off in Meno. If your iPhone asks whether Meno can send notifications, tap Allow.'
                  : 'Your iPhone will ask if Meno can send notifications — tap Allow.'}
              </Text>
              <Action
                label={reminders?.canAsk ? 'Allow notifications' : 'Turn on reminders'}
                onPress={() => void turnOnQuizzes()}
              />
            </>
          )}
        </Section>
      )}

      {shown.has('homeWidget') && (
        <Section
          sectionKey="homeWidget"
          title="Home Screen widget"
          status={statuses.homeWidget}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>
            Shows your current verse on your Home Screen. As you learn it, words disappear — a
            gentle nudge to fill them in from memory.
          </Text>
          <HomeWidgetShot accessibilityLabel="Example: the Meno widget on a Home Screen, showing Philippians 4:4 with some words blanked out" />
          <Steps
            items={[
              'Go to your Home Screen. (Swipe up from the bottom edge to leave Meno.)',
              'Touch and hold an empty spot until the apps start to wiggle.',
              'Tap Edit in the top-left corner, then tap Add Widget.',
              'Type “Meno” in the search box, then tap Meno.',
              'Swipe left or right to pick a size, then tap Add Widget.',
              'Tap Done in the top-right corner.',
            ]}
          />
          <Text style={[styles.tip, faint]}>
            Tip: learning more than one passage? Tap “Show on widgets” under the one you want on
            Today or in Library. To choose how much of the verse shows, touch and hold the widget
            and tap Edit Widget.
          </Text>
        </Section>
      )}

      {shown.has('lockWidget') && (
        <Section
          sectionKey="lockWidget"
          title="Lock Screen widget"
          status={statuses.lockWidget}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>
            Puts your verse right under the clock, so you see it every time you pick up your phone.
          </Text>
          <LockScreenShot accessibilityLabel="Example: the Meno widget under the clock on a Lock Screen, showing Philippians 4:4" />
          <Steps
            items={[
              'Press the side button to lock your iPhone, then tap the screen to wake it. Stay on the Lock Screen — don’t swipe up.',
              'Touch and hold the Lock Screen until Customize appears at the bottom.',
              'Tap Customize. If your iPhone asks, choose Lock Screen.',
              'Tap the widget area (it may say Add Widgets).',
              'Scroll to Meno, tap it, then tap the widget to add it.',
              'Close the widget list, then tap Done.',
            ]}
          />
          <Text style={[styles.tip, faint]}>
            Tip: while customizing, drag the widget up to sit right under the clock, or tap it to
            change how much of the verse shows.
          </Text>
        </Section>
      )}

      {shown.has('speak') && (
        <Section
          sectionKey="speak"
          title="Speaking your verse"
          status={statuses.speak}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>
            In Speak rounds you say the verse out loud and Meno checks it. Your voice is handled on
            this iPhone and never leaves it. You can always type instead.
          </Text>
          {statuses.speak === 'openSettings' ? (
            <>
              <Steps
                items={[
                  'Tap Open iPhone Settings below.',
                  'Turn on Microphone and Speech Recognition.',
                  'Come back to Meno — this page updates by itself.',
                ]}
              />
              <Action label="Open iPhone Settings" onPress={openIphoneSettings} />
            </>
          ) : statuses.speak === 'ready' ? (
            <Text style={[styles.tip, faint]}>
              You’re all set — tap the mic in any Speak round.
            </Text>
          ) : (
            <>
              <Text style={[styles.tip, faint]}>
                Your iPhone will ask about the microphone and speech recognition — tap Allow for
                both.
              </Text>
              <Action label="Allow microphone" onPress={() => void allowMicrophone()} />
            </>
          )}
        </Section>
      )}

      {shown.has('lock') && (
        <Section
          sectionKey="lock"
          title="Recite to unlock"
          status={statuses.lock}
          onSectionLayout={recordOffset}>
          <Text style={[styles.body, text]}>
            Optional. Pick the apps that eat your time; before one opens, Meno asks you to recite
            your verse. Override is always one tap away, and you can switch it off anytime.
          </Text>
          {statuses.lock === 'unavailable' ? (
            <Text style={[styles.tip, faint]}>
              This uses Apple’s Screen Time, which only works on a real iPhone — not in the
              simulator.
            </Text>
          ) : statuses.lock === 'ready' ? (
            <Text style={[styles.tip, faint]}>
              It’s on. To turn it off completely, go to Settings → Turn off and clear all shields
              now.
            </Text>
          ) : (
            <>
              <Steps
                items={[
                  'Tap Set up recite-to-unlock below.',
                  'When your iPhone asks about Screen Time, allow it (you may need Face ID or your passcode).',
                  'Pick the apps that should ask for a verse first.',
                  'Choose when Meno should ask, and finish setup.',
                ]}
              />
              <Action label="Set up recite-to-unlock" onPress={openLockSetup} />
            </>
          )}
        </Section>
      )}

      {faq && (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, styles.faqHeading, text]}>
            Common questions
          </Text>
          <Card>
            {FAQ.map(({ q, a }, i) => {
              const open = openFaq === i;
              return (
                <View
                  key={q}
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
                    <Text style={[styles.faqQuestion, text]}>{q}</Text>
                    <Text
                      importantForAccessibility="no"
                      accessibilityElementsHidden
                      style={[styles.faqToggle, { color: colors.lapis }]}>
                      {open ? '−' : '+'}
                    </Text>
                  </Pressable>
                  {open && <Text style={[styles.faqAnswer, faint]}>{a}</Text>}
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
  onSectionLayout,
  children,
}: PropsWithChildren<{
  sectionKey: SectionKey;
  title: string;
  status: Status;
  /** Overrides the stock wording for `status`. */
  statusLabel?: string;
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
          <StatusText status={status} label={statusLabel} />
        </View>
        {children}
      </Card>
    </View>
  );
}

/** Status is always spelled out, never color alone. */
function StatusText({ status, label }: { status: Status; label?: string }) {
  const colors = useThemeColors();
  const color =
    status === 'ready'
      ? colors.success
      : status === 'openSettings'
        ? colors.error
        : colors.inkFaint;
  const mark = status === 'ready' ? '✓ ' : status === 'openSettings' ? '! ' : '';
  return (
    <Text style={[styles.status, { color, fontFamily: fonts?.ui }]}>
      {mark}
      {label ?? STATUS_LABEL[status]}
    </Text>
  );
}

function Steps({ items }: { items: string[] }) {
  const colors = useThemeColors();
  return (
    <View style={styles.steps}>
      {items.map((item, i) => (
        <View
          key={item}
          style={styles.stepRow}
          accessible
          accessibilityLabel={`Step ${i + 1}: ${item}`}>
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

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, { backgroundColor: colors.lapis }]}>
      <Text style={[styles.actionText, { fontFamily: fonts?.ui }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  guide: { gap: spacing.lg },
  body: { fontSize: 16, lineHeight: 23 },
  tip: { fontSize: 15, lineHeight: 21 },
  overviewRow: { paddingVertical: spacing.sm, gap: 2 },
  overviewTitle: { fontSize: 17, fontWeight: '600' },
  status: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  section: { gap: spacing.md },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  steps: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.sm },
  stepNumber: { fontSize: 16, lineHeight: 23, fontWeight: '700', minWidth: 22 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 23 },
  action: {
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  actionText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  faqHeading: { marginTop: spacing.sm },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  faqQuestion: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  faqToggle: { fontSize: 22, lineHeight: 22, fontWeight: '500' },
  faqAnswer: { fontSize: 15, lineHeight: 22, paddingBottom: spacing.md },
});
