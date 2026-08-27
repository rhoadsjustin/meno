import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { loadLockConfig, lockEventCounts, saveLockConfig } from '@/services/db/repos/lock';
import { isLockAvailable, killSwitch } from '@/services/lock';
import { notificationsEnabled, setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, spacing } from '@/theme';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const [notifsOn, setNotifsOn] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockStats, setLockStats] = useState({ recitations: 0, overrides: 0 });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [notifs, lock, stats] = await Promise.all([
          notificationsEnabled(),
          loadLockConfig(),
          lockEventCounts(),
        ]);
        if (!cancelled) {
          setNotifsOn(notifs);
          setLockEnabled(lock.enabled);
          setLockStats(stats);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const toggleNotifications = useCallback(async (value: boolean) => {
    const applied = await setNotificationsEnabled(value);
    setNotifsOn(value && applied);
  }, []);

  const disableLock = useCallback(async () => {
    killSwitch();
    await saveLockConfig({ enabled: false });
    setLockEnabled(false);
  }, []);

  return (
    <Screen title="Settings">
      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
              Review reminders
            </Text>
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Up to two surprise pop quizzes a day, between 9am and 9pm.
            </Text>
          </View>
          <Switch
            value={notifsOn}
            onValueChange={(v) => void toggleNotifications(v)}
            trackColor={{ true: colors.lapis }}
            accessibilityLabel="Review reminders"
          />
        </View>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/lock-setup')}
          style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            Recite to Unlock
          </Text>
          <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {isLockAvailable()
              ? lockEnabled
                ? `On · this week: ${lockStats.recitations} recitations, ${lockStats.overrides} overrides`
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
          Meno {Constants.expoConfig?.version ?? ''} · Scripture: WEB, KJV, ASV — public domain.
          Recitation audio never leaves this device.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 14, lineHeight: 19 },
  killSwitch: { fontSize: 15, fontWeight: '600', marginTop: spacing.md },
});
