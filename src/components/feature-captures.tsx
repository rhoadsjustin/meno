/**
 * Real captures of Meno's widgets (simulator, seeded demo goal), shared by
 * onboarding and the setup guide. The Home Screen widget ships a light/dark
 * pair to match the theme; the Lock Screen reads dark either way, so one
 * capture serves both. Verse text in them is WEB (public domain), so bundling
 * it is fine. If the PNGs are re-captured, update the aspect ratios below.
 */
import { Image } from 'expo-image';
import { StyleSheet, useColorScheme } from 'react-native';

const homeWidgetLight = require('@/assets/images/onboarding/widget-home-light.png');
const homeWidgetDark = require('@/assets/images/onboarding/widget-home-dark.png');
const lockScreen = require('@/assets/images/onboarding/lock-screen.png');

type ShotProps = {
  /** When set, the image is its own VoiceOver element; otherwise the parent describes it. */
  accessibilityLabel?: string;
};

export function HomeWidgetShot({ accessibilityLabel }: ShotProps) {
  const dark = useColorScheme() === 'dark';
  return (
    <Image
      source={dark ? homeWidgetDark : homeWidgetLight}
      style={styles.homeWidget}
      contentFit="contain"
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function LockScreenShot({ accessibilityLabel }: ShotProps) {
  return (
    <Image
      source={lockScreen}
      style={styles.lockScreen}
      contentFit="contain"
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  homeWidget: { width: '100%', aspectRatio: 900 / 448 },
  lockScreen: { width: '100%', aspectRatio: 900 / 507 },
});
