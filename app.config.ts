import type { ExpoConfig } from 'expo/config';

// The Expo config loader can't import sibling .ts modules, so the two
// surface colors are duplicated from src/theme/palette.ts — keep in sync.
const surfaceLight = '#FBFAF7'; // vellum
const surfaceDark = '#10131A'; // night lapis-black

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
      backgroundColor: surfaceLight,
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
        backgroundColor: surfaceLight,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: surfaceDark },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
