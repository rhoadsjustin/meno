import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Speaks a result or a phase change to VoiceOver / TalkBack. Queued on iOS:
 * these fire as the screen's content is replaced, and VoiceOver reading
 * whatever it lands on next would cut a plain announcement off.
 */
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
}

/**
 * Whether VoiceOver / TalkBack is running, kept current. False until the
 * first answer arrives, so the sighted layout is the default.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (live) setEnabled(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
