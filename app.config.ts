import type { ExpoConfig } from 'expo/config';

import { palette } from './src/theme/palette';

// Bundle id / package are placeholders until the human decides the final id
// (docs/08-roadmap.md open question 1 — affects the Family Controls
// entitlement request; decide before M0 ends).
const config: ExpoConfig = {
  name: 'Meno',
  slug: 'meno',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'meno',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'app.meno.client',
    icon: './assets/expo.icon',
    supportsTablet: false,
    // Universal-link scaffold; domain pending (docs/08-roadmap.md open question 4).
    associatedDomains: ['applinks:meno.app'],
  },
  android: {
    package: 'app.meno.client',
    adaptiveIcon: {
      backgroundColor: palette.light.surface,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: palette.light.surface,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: palette.dark.surface },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
