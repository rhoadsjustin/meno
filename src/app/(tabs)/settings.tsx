import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import { TimeField } from '@/components/time-field';
import { HelpGuide } from '@/features/help/HelpGuide';
import { ReminderStatusList } from '@/features/reminders/ReminderStatusList';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import { availableTranslations } from '@/services/bible';
import { loadLockConfig, lockEventCounts, saveLockConfig } from '@/services/db/repos/lock';
import { isLockAvailable, killSwitch } from '@/services/lock';
import {
  DEFAULT_REMINDER_TIME,
  reminderTime,
  setNotificationsEnabled,
  setReminderTime,
  type ReminderTime,
} from '@/services/notifications';
import { useThemeColors, fonts, spacing } from '@/theme';

/** Which row's detail the right pane shows on wide windows. */
type Detail = 'guide' | 'reminders' | 'lock';

export default function SettingsScreen() {
  const colors = useThemeColors();
  // Wide windows (iPhone Duo opened, Split View): a split view. The rows
  // become a selectable list on the left and the right pane shows what the
  // row leads to — the whole setup guide, or just the section that explains
  // the row — instead of pushing a modal (HIG: list and detail side by side).
  const { isWide } = useContentLayout();
  const [detail, setDetail] = useState<Detail>('guide');
  // Whether each reminder will arrive, and why not (the guide reads the same).
  const reminders = useReminderStatus();
  // The switch answers the tap at once and holds that until the next status
  // lands (iOS may be showing its prompt in between).
  const [tapped, setTapped] = useState<{ value: boolean; over: typeof reminders } | null>(null);
  const notifsOn =
    tapped && tapped.over === reminders ? tapped.value : !!reminders && reminders.overall !== 'off';
  const notifsBlocked = reminders?.overall === 'blocked';
  const [remindAt, setRemindAt] = useState<ReminderTime>(DEFAULT_REMINDER_TIME);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockStats, setLockStats] = useState({ recitations: 0, overrides: 0 });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [time, lock, stats] = await Promise.all([
          reminderTime(),
          loadLockConfig(),
          lockEventCounts(),
        ]);
        if (!cancelled) {
          setRemindAt(time);
          setLockEnabled(lock.enabled);
          setLockStats(stats);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Asked for, and iOS said no: the switch stays on and the card says what
  // is in the way, instead of silently snapping back.
  const toggleNotifications = useCallback(
    async (value: boolean) => {
      setTapped({ value, over: reminders });
      await setNotificationsEnabled(value);
    },
    [reminders],
  );

  const changeReminderTime = useCallback(async (time: ReminderTime) => {
    setRemindAt(time);
    await setReminderTime(time);
  }, []);

  const disableLock = useCallback(async () => {
    killSwitch();
    await saveLockConfig({ enabled: false });
    setLockEnabled(false);
  }, []);

  const selected = (d: Detail) => isWide && detail === d;
  const rowCard = (d: Detail) =>
    selected(d) ? { backgroundColor: colors.lapisWash, borderColor: colors.lapisWash } : undefined;
  const titleColor = (d: Detail) => (selected(d) ? colors.lapis : colors.ink);

  // The footer credits whatever the wizard offers, so a licensed translation
  // (ESV, when its key is configured) is never listed as public domain.
  const translations = availableTranslations();
  const publicDomain = translations
    .filter((t) => t.licenseType === 'public_domain')
    .map((t) => t.abbrev)
    .join(', ');
  // ESV carries its own line here; versions from the translation catalog
  // are credited where their text shows and named as a group.
  const licensed = translations.filter(
    (t) => t.licenseType !== 'public_domain' && t.source !== 'youversion',
  );
  const catalogCount = translations.filter((t) => t.source === 'youversion').length;

  const rows = (
    <>
      <Card style={rowCard('guide')}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={isWide ? { selected: detail === 'guide' } : undefined}
          accessibilityHint={
            isWide ? 'Shows the guide beside this list' : 'Opens a step-by-step guide'
          }
          onPress={() => (isWide ? setDetail('guide') : router.push('/help'))}
          style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: titleColor('guide'), fontFamily: fonts?.ui }]}>
            How to set up Meno
          </Text>
          <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            Step by step: quizzes, widgets, speaking, and recite-to-unlock — plus common questions.
          </Text>
        </Pressable>
      </Card>

      <Card style={rowCard('reminders')}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole={isWide ? 'button' : undefined}
            accessibilityState={isWide ? { selected: detail === 'reminders' } : undefined}
            accessibilityHint={isWide ? 'Shows how quizzes work beside this list' : undefined}
            disabled={!isWide}
            onPress={() => setDetail('reminders')}
            style={styles.rowText}>
            <Text
              style={[styles.rowTitle, { color: titleColor('reminders'), fontFamily: fonts?.ui }]}>
              Reminders
            </Text>
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              A daily nudge to practice, plus surprise pop quizzes on verses you’ve memorized. Never
              more than two a day.
            </Text>
          </Pressable>
          <Switch
            value={notifsOn}
            onValueChange={(v) => void toggleNotifications(v)}
            trackColor={{ true: colors.lapis }}
            accessibilityLabel="Reminders"
          />
        </View>
        {reminders && reminders.overall === 'off' && (
          <View style={[styles.subRow, { borderTopColor: colors.separator }]}>
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Off. Meno won’t send you anything until you turn this on.
            </Text>
          </View>
        )}
        {reminders && reminders.overall !== 'off' && (
          <View style={[styles.subRow, { borderTopColor: colors.separator }]}>
            <ReminderStatusList status={reminders} />
          </View>
        )}
        {reminders?.overall === 'on' && (
          <>
            <View style={[styles.row, styles.subRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.rowLabel, { color: colors.ink, fontFamily: fonts?.ui }]}>
                Remind me at
              </Text>
              <TimeField
                hour={remindAt.hour}
                minute={remindAt.minute}
                onChange={(time) => void changeReminderTime(time)}
                accessibilityLabel="Daily reminder time"
              />
            </View>
            <Text
              style={[
                styles.rowSub,
                styles.footnote,
                { color: colors.inkFaint, fontFamily: fonts?.ui },
              ]}>
              A Focus or Scheduled Summary on your iPhone can still hold these back. Meno can’t see
              either one.
            </Text>
          </>
        )}
        {notifsBlocked &&
          (reminders.canAsk ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void toggleNotifications(true)}
              style={[styles.subRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Your iPhone will ask if Meno can send notifications. Tap Allow.
              </Text>
              <Text style={[styles.rowAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                Allow notifications
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openSettings()}
              style={[styles.subRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                Turn on Allow Notifications for Meno and they start by themselves.
              </Text>
              <Text style={[styles.rowAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                Open iPhone Settings
              </Text>
            </Pressable>
          ))}
      </Card>

      <Card style={rowCard('lock')}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={isWide ? { selected: detail === 'lock' } : undefined}
          accessibilityHint={isWide ? 'Shows the setup steps beside this list' : undefined}
          onPress={() => (isWide ? setDetail('lock') : router.push('/lock-setup'))}
          style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: titleColor('lock'), fontFamily: fonts?.ui }]}>
            Recite to Unlock
          </Text>
          <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {isLockAvailable()
              ? lockEnabled
                ? `On · this week: ${lockStats.recitations} ${lockStats.recitations === 1 ? 'recitation' : 'recitations'}, ${lockStats.overrides} ${lockStats.overrides === 1 ? 'override' : 'overrides'}`
                : 'Ask for a verse before your distracting apps open.'
              : 'Available on your iPhone (not in the simulator).'}
          </Text>
        </Pressable>
        {lockEnabled && (
          <Pressable accessibilityRole="button" onPress={() => void disableLock()}>
            <Text style={[styles.killSwitch, { color: colors.error, fontFamily: fonts?.ui }]}>
              Turn off and clear all shields now
            </Text>
          </Pressable>
        )}
      </Card>

      <Card>
        <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Meno {Constants.expoConfig?.version ?? ''} · Scripture: {publicDomain} — public domain.
          Recitation audio never leaves this device.
        </Text>
        {licensed.map((t) => (
          <Text
            key={t.id}
            style={[
              styles.rowSub,
              styles.credit,
              { color: colors.inkFaint, fontFamily: fonts?.ui },
            ]}>
            {t.attribution}
          </Text>
        ))}
        {catalogCount > 0 && (
          <Text
            style={[
              styles.rowSub,
              styles.credit,
              { color: colors.inkFaint, fontFamily: fonts?.ui },
            ]}>
            Other translations are shown under license from their publishers, each with its own
            copyright line, and aren’t stored on this device.
          </Text>
        )}
      </Card>
    </>
  );

  // The detail pane: the guide in full, or the one section the row is about.
  const detailPane =
    detail === 'guide' ? (
      <HelpGuide />
    ) : detail === 'reminders' ? (
      <HelpGuide sections={['quizzes']} overview={false} faq={false} reminderLines={false} />
    ) : (
      <HelpGuide sections={['lock']} overview={false} faq={false} />
    );

  return (
    <Screen title="Settings" wide>
      {isWide ? (
        <FoldAwareRow>
          {rows}
          {detailPane}
        </FoldAwareRow>
      ) : (
        rows
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 14, lineHeight: 19 },
  rowLabel: { flex: 1, fontSize: 16 },
  credit: { marginTop: spacing.sm },
  footnote: { marginTop: spacing.md },
  rowAction: { fontSize: 15, fontWeight: '600', marginTop: spacing.xs },
  subRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  killSwitch: { fontSize: 15, fontWeight: '600', marginTop: spacing.md },
});
