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
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // 'device-activity' is the hardcoded scheme the ShieldAction extension's
  // "openApp" action opens (react-native-device-activity Shared.swift) —
  // it must resolve to this app for "Recite to unlock" to work.
  scheme: ['meno', 'device-activity'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.rhoadsdev.meno',
    appleTeamId: 'Z8825H46UN',
    supportsTablet: false,
    infoPlist: {
      // Standard HTTPS only — export-compliance exempt (skips the ASC
      // encryption questionnaire on every build).
      ITSAppUsesNonExemptEncryption: false,
      // ITMS-90683: a bundled image framework references the Photos APIs,
      // so Apple requires these strings even though Meno never reads or
      // saves photos. Keep them honest.
      NSPhotoLibraryUsageDescription:
        'Meno does not access your photo library. This notice is required by a bundled image framework.',
      NSPhotoLibraryAddUsageDescription:
        'Meno does not save to your photo library. This notice is required by a bundled image framework.',
    },
    // App-level privacy manifest (ship checklist, docs/08): no tracking, no
    // data collection; UserDefaults use (app group) declared with CA92.1.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
    },
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
      'expo-speech-recognition',
      {
        microphonePermission:
          'Meno uses the microphone so you can recite verses aloud. Audio is processed on this device and never leaves your phone.',
        speechRecognitionPermission:
          'Meno transcribes your recitation on this device to check it against the verse. Nothing is sent to a server.',
      },
    ],
    [
      'expo-notifications',
      {
        // Android small icon (white alpha mask) + accent; iOS notifications
        // always use the app icon — nothing to configure there.
        icon: './assets/images/notification-icon.png',
        color: '#2244AA',
      },
    ],
    [
      'react-native-device-activity',
      {
        appleTeamId: 'Z8825H46UN',
        appGroup: 'group.com.rhoadsdev.meno',
      },
    ],
    [
      'expo-widgets',
      {
        bundleIdentifier: 'com.rhoadsdev.meno.widgets',
        groupIdentifier: 'group.com.rhoadsdev.meno',
        widgets: [
          {
            name: 'MenoWidget',
            displayName: 'Meno',
            description: 'Your current verse — dissolving as you learn it.',
            ios: {
              supportedFamilies: [
                'systemSmall',
                'systemMedium',
                'systemLarge',
                'accessoryCircular',
                'accessoryRectangular',
                'accessoryInline',
              ],
            },
          },
        ],
      },
    ],
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
