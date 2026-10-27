import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useTranslation } from '@/i18n/react';
import { useReminderStatus } from '@/features/reminders/useReminderStatus';
import { dismissReminderPrompt, reminderPromptDismissed } from '@/services/db/repos/appFlags';
import { setNotificationsEnabled } from '@/services/notifications';
import { useThemeColors, fonts, spacing } from '@/theme';

/**
 * Today's one gentle prompt for someone with a passage under way whose
 * reminders are off, or on but blocked by iOS. Shown until answered or
 * closed, then never again (06 §6: no nagging, no guilt) — and never at all
 * for someone whose reminders have ever been getting through. Settings →
 * Reminders keeps saying where things stand after that.
 */
export function ReminderPrompt({ eligible }: { eligible: boolean }) {
  const colors = useThemeColors();
  const { t } = useTranslation(['notifications', 'common']);
  const status = useReminderStatus();
  // null until read, so the card never flashes for someone who closed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    reminderPromptDismissed()
      .then((value) => {
        if (!cancelled) setDismissed(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void dismissReminderPrompt();
  }, []);

  // Reminders getting through answers the prompt for good, whether they
  // were turned on from here or anywhere else.
  const working = status?.overall === 'on';
  useEffect(() => {
    if (!working) return;
    let cancelled = false;
    dismissReminderPrompt()
      .then(() => {
        if (!cancelled) setDismissed(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [working]);

  if (!eligible || dismissed !== false || !status || status.overall === 'on') return null;

  const blocked = status.overall === 'blocked';
  // iOS shows its prompt only once; after a "Don't Allow" the way back is
  // iPhone Settings.
  const viaIphoneSettings = blocked && !status.canAsk;
  const text = { fontFamily: fonts?.ui };

  return (
    <Card>
      <Text accessibilityRole="header" style={[styles.title, text, { color: colors.ink }]}>
        {blocked ? t('prompt.titleBlocked') : t('prompt.titleOff')}
      </Text>
      <Text style={[styles.body, text, { color: colors.inkFaint }]}>
        {viaIphoneSettings
          ? t('prompt.bodyViaSettings')
          : blocked
            ? t('prompt.bodyBlocked')
            : t('prompt.bodyOff')}
      </Text>
      <View style={styles.actions}>
        {viaIphoneSettings ? (
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => void Linking.openSettings()}>
            <Text style={[styles.action, text, { color: colors.lapis }]}>{t('prompt.openSettings')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void setNotificationsEnabled(true)}>
            <Text style={[styles.action, text, { color: colors.lapis }]}>
              {blocked ? t('prompt.allow') : t('prompt.turnOn')}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('prompt.dismissHint')}
          hitSlop={8}
          onPress={dismiss}>
          <Text style={[styles.action, text, { color: colors.inkFaint }]}>{t('common:notNow')}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  body: { fontSize: 15, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  action: { fontSize: 15, fontWeight: '600' },
});
