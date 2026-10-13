import { DatePicker, Host } from '@expo/ui/swift-ui';

import type { TimeFieldProps } from '@/components/time-field';

/** The system time picker (compact style): tap the time to change it. The
 * picker voices its own value, so the caller's label sits beside it. */
export function TimeField({ hour, minute, onChange }: TimeFieldProps) {
  const selection = new Date();
  selection.setHours(hour, minute, 0, 0);
  return (
    <Host matchContents>
      <DatePicker
        selection={selection}
        displayedComponents={['hourAndMinute']}
        onDateChange={(date) => onChange({ hour: date.getHours(), minute: date.getMinutes() })}
      />
    </Host>
  );
}
