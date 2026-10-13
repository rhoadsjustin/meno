import { Text } from 'react-native';

import { useThemeColors, fonts } from '@/theme';

export type TimeFieldProps = {
  hour: number;
  minute: number;
  onChange: (time: { hour: number; minute: number }) => void;
  accessibilityLabel?: string;
};

/**
 * A time of day the user can change. iOS renders the system picker
 * (`time-field.ios.tsx`); elsewhere the time is shown read-only until the
 * Android pass (M7) gives it a native control.
 */
export function TimeField({ hour, minute, accessibilityLabel }: TimeFieldProps) {
  const colors = useThemeColors();
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      style={{ color: colors.ink, fontFamily: fonts?.ui, fontSize: 17 }}>
      {at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
    </Text>
  );
}
