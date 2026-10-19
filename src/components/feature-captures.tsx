/**
 * Real captures of Meno's widgets (simulator, seeded demo goal), shared by
 * onboarding and the setup guide. The Home Screen widget ships a light/dark
 * pair to match the theme; the Lock Screen reads dark either way, so one
 * capture serves both. Verse text in them is WEB (public domain), so bundling
 * it is fine. If the PNGs are re-captured, update the aspect ratios below.
 *
 * Each UI language has its own set, captured on a simulator running in that
 * language (iOS chrome, date and book names all follow it). The language is
 * fixed for the app's lifetime — iOS relaunches the app when it changes.
 */
import { Image } from 'expo-image';
import { StyleSheet, useColorScheme } from 'react-native';

import { language, type Language } from '@/i18n';

const captures: Record<Language, { homeLight: number; homeDark: number; lock: number }> = {
  en: {
    homeLight: require('@/assets/images/onboarding/widget-home-light.png'),
    homeDark: require('@/assets/images/onboarding/widget-home-dark.png'),
    lock: require('@/assets/images/onboarding/lock-screen.png'),
  },
  es: {
    homeLight: require('@/assets/images/onboarding/widget-home-light-es.png'),
    homeDark: require('@/assets/images/onboarding/widget-home-dark-es.png'),
    lock: require('@/assets/images/onboarding/lock-screen-es.png'),
  },
};

type ShotProps = {
  /** When set, the image is its own VoiceOver element; otherwise the parent describes it. */
  accessibilityLabel?: string;
};

export function HomeWidgetShot({ accessibilityLabel }: ShotProps) {
  const dark = useColorScheme() === 'dark';
  const shots = captures[language()];
  return (
    <Image
      source={dark ? shots.homeDark : shots.homeLight}
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
      source={captures[language()].lock}
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
