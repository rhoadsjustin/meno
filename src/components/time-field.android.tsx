import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { getCalendars } from 'expo-localization';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import type { TimeFieldProps } from '@/components/time-field';
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { useThemeColors, fonts } from '@/theme';

/**
 * The time as a tappable value that opens Material's time picker dialog,
 * the Android counterpart of iOS's compact picker. The dialog follows the
 * phone's 12/24-hour setting.
 */
export function TimeField({ hour, minute, onChange, accessibilityLabel }: TimeFieldProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  const shown = at.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, ${shown}` : shown}
        hitSlop={12}
        onPress={() => setOpen(true)}>
        <Text style={{ color: colors.lapis, fontFamily: fonts?.ui, fontSize: 17 }}>{shown}</Text>
      </Pressable>
      {open && (
        <Host matchContents>
          <TimePickerDialog
            initialDate={at.toISOString()}
            is24Hour={getCalendars()[0]?.uses24hourClock ?? false}
            confirmButtonLabel={t('ok')}
            dismissButtonLabel={t('cancel')}
            color={colors.lapis}
            onDateSelected={(date) => {
              setOpen(false);
              onChange({ hour: date.getHours(), minute: date.getMinutes() });
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      )}
    </>
  );
}
