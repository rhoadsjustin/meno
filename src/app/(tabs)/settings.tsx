import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { TimeField } from '@/components/time-field';
import { HelpGuide } from '@/features/help/HelpGuide';
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
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
import { restartIntoUpdate, useUpdateStatus } from '@/services/updates';
import { useThemeColors, fonts, spacing } from '@/theme';

/** Which row's detail the right pane shows on wide windows. */
type Detail = 'guide' | 'reminders' | 'lock';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['settings', 'stats', 'app']);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  // An over-the-air update waiting for a restart, and whether one is running.
  const update = useUpdateStatus();
  // Windows wider than tall (iPhone Duo opened, Split View): a split view.
  // The rows become a selectable list on the left and the right pane shows
  // what the row leads to — the whole setup guide, or just the section that
  // explains the row — instead of pushing a modal (HIG: list and detail side
  // by side). Opened and rotated (669×951) is one column that pushes the
  // guide and lock setup, as on a phone.
  const { twoPane } = useContentLayout();
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
    AccessibilityInfo.announceForAccessibility(t('lock.killSwitchDone'));
  }, [t]);

  const selected = (d: Detail) => twoPane && detail === d;
  const rowCard = (d: Detail) =>
    selected(d) ? { backgroundColor: colors.lapisWash, borderColor: colors.lapisWash } : undefined;
  // On the selection wash, inkFaint (light) and lapis (dark) fall to 4.1:1,
  // so a selected row's text steps up to ink there; the wash is the cue.
  const titleColor = (d: Detail) =>
    selected(d) && scheme === 'light' ? colors.lapis : colors.ink;
  const subColor = (d: Detail) => (selected(d) ? colors.ink : colors.inkFaint);

  // The footer credits whatever the wizard offers, so a licensed translation
  // (ESV, when its key is configured) is never listed as public domain.
  const translations = availableTranslations();
  const publicDomain = translations
    .filter((tr) => tr.licenseType === 'public_domain')
    .map((tr) => tr.abbrev)
    .join(', ');
  // ESV carries its own line here; versions from the translation catalog
  // are credited where their text shows and named as a group.
  const licensed = translations.filter(
    (tr) => tr.licenseType !== 'public_domain' && tr.source !== 'youversion',
  );
  const catalogCount = translations.filter((tr) => tr.source === 'youversion').length;

  const rows = (
    <>
      <Card style={rowCard('guide')}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={twoPane ? { selected: detail === 'guide' } : undefined}
          accessibilityHint={twoPane ? t('guide.hintWide') : t('guide.hint')}
          onPress={() => (twoPane ? setDetail('guide') : router.push('/help'))}
          style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: titleColor('guide'), fontFamily: fonts?.ui }]}>
            {t('guide.title')}
          </Text>
          <Text style={[styles.rowSub, { color: subColor('guide'), fontFamily: fonts?.ui }]}>
            {t('guide.body')}
          </Text>
        </Pressable>
      </Card>

      <Card style={rowCard('reminders')}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole={twoPane ? 'button' : undefined}
            accessibilityState={twoPane ? { selected: detail === 'reminders' } : undefined}
            accessibilityHint={twoPane ? t('reminders.hintWide') : undefined}
            disabled={!twoPane}
            onPress={() => setDetail('reminders')}
            style={styles.rowText}>
            <Text
              style={[styles.rowTitle, { color: titleColor('reminders'), fontFamily: fonts?.ui }]}>
              {t('reminders.title')}
            </Text>
            <Text style={[styles.rowSub, { color: subColor('reminders'), fontFamily: fonts?.ui }]}>
              {t('reminders.body')}
            </Text>
          </Pressable>
          <Switch
            value={notifsOn}
            onValueChange={(v) => void toggleNotifications(v)}
            trackColor={{ true: colors.lapis }}
            accessibilityLabel={t('reminders.title')}
          />
        </View>
        {reminders && reminders.overall === 'off' && (
          <View style={[styles.subRow, { borderTopColor: colors.separator }]}>
            <Text style={[styles.rowSub, { color: subColor('reminders'), fontFamily: fonts?.ui }]}>
              {t('reminders.off')}
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
                {t('reminders.remindAt')}
              </Text>
              <TimeField
                hour={remindAt.hour}
                minute={remindAt.minute}
                onChange={(time) => void changeReminderTime(time)}
                accessibilityLabel={t('reminders.timeLabel')}
              />
            </View>
            <Text
              style={[
                styles.rowSub,
                styles.footnote,
                { color: subColor('reminders'), fontFamily: fonts?.ui },
              ]}>
              {t('reminders.focusNote')}
            </Text>
          </>
        )}
        {notifsBlocked &&
          (reminders.canAsk ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void toggleNotifications(true)}
              style={[styles.subRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.rowSub, { color: subColor('reminders'), fontFamily: fonts?.ui }]}>
                {t('reminders.askNote')}
              </Text>
              <Text style={[styles.rowAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                {t('reminders.allow')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openSettings()}
              style={[styles.subRow, { borderTopColor: colors.separator }]}>
              <Text style={[styles.rowSub, { color: subColor('reminders'), fontFamily: fonts?.ui }]}>
                {t('reminders.blockedNote')}
              </Text>
              <Text style={[styles.rowAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                {t('reminders.openSettings')}
              </Text>
            </Pressable>
          ))}
      </Card>

      {/* Recite to Unlock is built on Apple's Screen Time; Android has no
          equivalent yet, so the row isn't offered there at all. */}
      {Platform.OS === 'ios' && (
        <Card style={rowCard('lock')}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={twoPane ? { selected: detail === 'lock' } : undefined}
            accessibilityHint={twoPane ? t('lock.hintWide') : undefined}
            onPress={() => (twoPane ? setDetail('lock') : router.push('/lock-setup'))}
            style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: titleColor('lock'), fontFamily: fonts?.ui }]}>
              {t('lock.title')}
            </Text>
            <Text style={[styles.rowSub, { color: subColor('lock'), fontFamily: fonts?.ui }]}>
              {isLockAvailable()
                ? lockEnabled
                  ? t('lock.onSummary', {
                      recitations: t('stats:recitationCount', { count: lockStats.recitations }),
                      overrides: t('stats:overrideCount', { count: lockStats.overrides }),
                    })
                  : t('lock.offBody')
                : t('lock.unavailable')}
            </Text>
          </Pressable>
          {lockEnabled && (
            // The escape of 04 §6: its own row and a full-size target.
            <View style={[styles.killSwitch, { borderTopColor: colors.separator }]}>
              <TextLink
                tone="destructive"
                weight="semibold"
                label={t('lock.killSwitch')}
                onPress={() => void disableLock()}
              />
            </View>
          )}
        </Card>
      )}

      {update.pending && (
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityHint={t('update.hint')}
            onPress={() => void restartIntoUpdate(scheme)}
            style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('update.title')}
            </Text>
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('update.body')}
            </Text>
            <Text style={[styles.rowAction, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('update.restart')}
            </Text>
          </Pressable>
        </Card>
      )}

      <Card>
        <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('footer', {
            version: update.runningUpdateDate
              ? t('updatedVersion', {
                  version: Constants.expoConfig?.version ?? '',
                  date: update.runningUpdateDate.toLocaleDateString(locale(), {
                    month: 'short',
                    day: 'numeric',
                  }),
                })
              : (Constants.expoConfig?.version ?? ''),
            translations: publicDomain,
          })}
        </Text>
        {licensed.map((tr) => (
          <Text
            key={tr.id}
            style={[
              styles.rowSub,
              styles.credit,
              { color: colors.inkFaint, fontFamily: fonts?.ui },
            ]}>
            {tr.attribution}
          </Text>
        ))}
        {catalogCount > 0 && (
          <Text
            style={[
              styles.rowSub,
              styles.credit,
              { color: colors.inkFaint, fontFamily: fonts?.ui },
            ]}>
            {t('catalogCredit')}
          </Text>
        )}
      </Card>
    </>
  );

  // The detail pane: the guide in full, or the one section the row is about.
  const detailPane =
    detail === 'guide' ? (
      // No checklist: the rows beside it are the index, and nothing here
      // scrolls the pane to a section.
      <HelpGuide overview={false} />
    ) : detail === 'reminders' ? (
      // The row beside it has the switch, the status and the way to allow
      // notifications, so the pane only explains.
      <HelpGuide sections={['quizzes']} overview={false} faq={false} remindersBeside />
    ) : (
      <HelpGuide sections={['lock']} overview={false} faq={false} />
    );

  return (
    <Screen title={t('app:tabs.settings')} wide>
      {/* Always the row: with no second pane the rows keep their place in
          the tree, so folding and unfolding does not remount them. */}
      <FoldAwareRow>
        {rows}
        {twoPane ? detailPane : null}
      </FoldAwareRow>
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
  // The 44pt link reaches into the card's bottom padding.
  killSwitch: {
    marginTop: spacing.md,
    marginBottom: -spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
