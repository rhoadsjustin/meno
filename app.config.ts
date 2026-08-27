import type { ExpoConfig } from 'expo/config';

// The Expo config loader can't import sibling .ts modules, so the two
// surface colors are duplicated from src/theme/palette.ts — keep in sync.
const surfaceLight = '#FBFAF7'; // vellum
const surfaceDark = '#10131A'; // night lapis-black

// Bundle id decided 2026-08-26: com.rhoadsdev.meno (also the id to use for
// the Family Controls entitlement request and its extension targets).
const config: ExpoConfig = {
  name: 'Meno',
  slug: 'meno',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'meno',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.rhoadsdev.meno',
    appleTeamId: 'Z8825H46UN',
    icon: './assets/expo.icon',
    supportsTablet: false,
    // Universal links deferred: the associated-domains entitlement blocks
    // local dev signing (wildcard team profile lacks the capability) and the
    // meno.app domain isn't live. Re-add before M8:
    // associatedDomains: ['applinks:meno.app'],
  },
  android: {
    package: 'com.rhoadsdev.meno',
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
  extra: {
    eas: {
      projectId: '6473c486-4b56-4c2c-9365-2ca7eeef6729',
    },
  },
  owner: 'rhoadsjustin',
};

export default config;
