import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Switch, useColorScheme } from 'react-native';

import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { Screen } from '@/components/screen';
import { TimeField } from '@/components/time-field';
import { HelpGuide } from '@/features/help/HelpGuide';
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { ReminderStatusList } from '@/features/reminders/ReminderStatusList';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/features/settings/links';
import { SettingsBlock, SettingsRow, SettingsSection } from '@/features/settings/SettingsList';
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
import { useThemeColors } from '@/theme';

/** Leaves for the browser; with none to open it, the row does nothing. */
function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Which row's detail the right pane shows on wide windows. */
type Detail = 'guide' | 'reminders';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation(['settings', 'stats', 'app']);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  // An over-the-air update waiting for a restart, and whether one is running.
  const update = useUpdateStatus();
  // Windows wider than tall (iPhone Duo opened, Split View): a split view.
  // The rows become a selectable list on the left and the right pane shows
  // the guide — whole, or just the section that explains reminders — instead
  // of pushing a modal (HIG: list and detail side by side). Lock setup is a
  // flow of its own and opens from its row in every layout. Opened and
  // rotated (669×951) is one column that pushes the guide, as on a phone.
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

  // Asked for, and iOS said no: the switch stays on and the group says what
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

  // About credits whatever the wizard offers, so a licensed translation
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
  const appVersion = Constants.expoConfig?.version ?? '';

  const lockAvailable = isLockAvailable();

  const rows = (
    <>
      <SettingsSection>
        <SettingsRow
          label={t('guide.title')}
          // Beside the list on wide windows, so nothing is disclosed.
          disclosure={twoPane ? undefined : 'chevron'}
          selected={selected('guide')}
          accessibilityState={twoPane ? { selected: detail === 'guide' } : undefined}
          accessibilityHint={twoPane ? t('guide.hintWide') : t('guide.hint')}
          onPress={() => (twoPane ? setDetail('guide') : router.push('/help'))}
        />
      </SettingsSection>

      {/* One footnote under the group: what reminders are while they are
          off, what is in the way while they are blocked, and what Meno
          can't see once they are on. */}
      <SettingsSection
        footer={
          !reminders || reminders.overall === 'off'
            ? t('reminders.body')
            : notifsBlocked
              ? reminders.canAsk
                ? t('reminders.askNote')
                : t('reminders.blockedNote')
              : t('reminders.focusNote')
        }>
        <SettingsRow
          label={t('reminders.title')}
          // In one column the label is only the switch's caption, and the
          // switch carries the name. On wide windows it selects the pane
          // that explains reminders.
          labelHidden={!twoPane}
          selected={selected('reminders')}
          accessibilityState={twoPane ? { selected: detail === 'reminders' } : undefined}
          accessibilityHint={twoPane ? t('reminders.hintWide') : undefined}
          onPress={twoPane ? () => setDetail('reminders') : undefined}
          trailing={
            <Switch
              value={notifsOn}
              onValueChange={(v) => void toggleNotifications(v)}
              trackColor={{ true: colors.lapis }}
              accessibilityLabel={t('reminders.title')}
            />
          }
        />
        {reminders?.overall === 'on' && (
          <SettingsRow
            label={t('reminders.remindAt')}
            // The picker names itself ("Daily reminder time, 8:00 AM").
            labelHidden
            trailing={
              <TimeField
                hour={remindAt.hour}
                minute={remindAt.minute}
                onChange={(time) => void changeReminderTime(time)}
                accessibilityLabel={t('reminders.timeLabel')}
              />
            }
          />
        )}
        {reminders && reminders.overall !== 'off' && (
          <SettingsBlock>
            <ReminderStatusList status={reminders} />
          </SettingsBlock>
        )}
        {/* Asked for, and iOS said no (or was never asked): the way through. */}
        {notifsBlocked &&
          (reminders.canAsk ? (
            <SettingsRow
              tone="accent"
              label={t('reminders.allow')}
              onPress={() => void toggleNotifications(true)}
            />
          ) : (
            <SettingsRow
              tone="accent"
              accessibilityRole="link"
              label={t('reminders.openSettings')}
              onPress={() => void Linking.openSettings()}
            />
          ))}
      </SettingsSection>

      {/* Recite to Unlock is built on Apple's Screen Time; Android has no
          equivalent yet, so the group isn't offered there at all. */}
      {Platform.OS === 'ios' && (
        <SettingsSection
          footer={
            !lockAvailable
              ? t('lock.unavailable')
              : lockEnabled
                ? t('lock.usage', {
                    recitations: t('stats:recitationCount', { count: lockStats.recitations }),
                    overrides: t('stats:overrideCount', { count: lockStats.overrides }),
                  })
                : t('lock.offBody')
          }>
          {/* Always opens setup, in one column and beside the guide alike. */}
          <SettingsRow
            label={t('lock.title')}
            value={lockAvailable ? (lockEnabled ? t('lock.on') : t('lock.off')) : undefined}
            disclosure="chevron"
            onPress={() => router.push('/lock-setup')}
          />
          {lockEnabled && (
            // The escape of 04 §6: its own row and a full-size target.
            <SettingsRow
              tone="destructive"
              label={t('lock.killSwitch')}
              onPress={() => void disableLock()}
            />
          )}
        </SettingsSection>
      )}

      {update.pending && (
        <SettingsSection title={t('update.title')} footer={t('update.body')}>
          <SettingsRow
            tone="accent"
            label={t('update.restart')}
            accessibilityHint={t('update.hint')}
            onPress={() => void restartIntoUpdate(scheme)}
          />
        </SettingsSection>
      )}

      <SettingsSection
        title={t('about.title')}
        footer={[
          t('about.credits', { translations: publicDomain }),
          ...licensed.map((tr) => tr.attribution),
          ...(catalogCount > 0 ? [t('catalogCredit')] : []),
        ]}>
        <SettingsRow
          label={t('about.version')}
          value={
            update.runningUpdateDate
              ? t('about.updatedVersion', {
                  version: appVersion,
                  date: update.runningUpdateDate.toLocaleDateString(locale(), {
                    month: 'short',
                    day: 'numeric',
                  }),
                })
              : appVersion
          }
        />
        <SettingsRow
          accessibilityRole="link"
          label={t('about.privacy')}
          disclosure="external"
          accessibilityHint={t('about.linkHint')}
          onPress={() => openLink(PRIVACY_POLICY_URL)}
        />
        <SettingsRow
          accessibilityRole="link"
          label={t('about.support')}
          disclosure="external"
          accessibilityHint={t('about.linkHint')}
          onPress={() => openLink(SUPPORT_URL)}
        />
      </SettingsSection>
    </>
  );

  // The detail pane: the guide in full, or the one section the row is about.
  const detailPane =
    detail === 'guide' ? (
      // No checklist: the rows beside it are the index, and nothing here
      // scrolls the pane to a section.
      <HelpGuide overview={false} />
    ) : (
      // The row beside it has the switch, the status and the way to allow
      // notifications, so the pane only explains.
      <HelpGuide sections={['quizzes']} overview={false} faq={false} remindersBeside />
    );

  return (
    <Screen title={t('app:tabs.settings')} wide panes={twoPane}>
      {/* Always the row: with no second pane the rows keep their place in
          the tree, so folding and unfolding does not remount them. Side by
          side, the rows stay put while the guide beside them is read. */}
      <FoldAwareRow scroll={twoPane}>
        {rows}
        {twoPane ? detailPane : null}
      </FoldAwareRow>
    </Screen>
  );
}

