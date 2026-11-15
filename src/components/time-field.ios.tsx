import { DatePicker, Host } from '@expo/ui/swift-ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';

import type { TimeFieldProps } from '@/components/time-field';

/** The system time picker (compact style): tap the time to change it. The
 * caller's label is the picker's title with the label hidden: nothing more
 * is drawn, and VoiceOver names the time ("Reminder time, 8:00 AM") instead
 * of reading a bare time. */
export function TimeField({ hour, minute, onChange, accessibilityLabel }: TimeFieldProps) {
  const selection = new Date();
  selection.setHours(hour, minute, 0, 0);
  return (
    <Host matchContents>
      <DatePicker
        title={accessibilityLabel}
        modifiers={accessibilityLabel ? [labelsHidden()] : undefined}
        selection={selection}
        displayedComponents={['hourAndMinute']}
        onDateChange={(date) => onChange({ hour: date.getHours(), minute: date.getMinutes() })}
      />
    </Host>
  );
}
