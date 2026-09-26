import type { ConfigContext, ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = 'a9c46548-a3d3-41a9-82b0-4d84fe9efa65';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Fitness Tracker',
  slug: 'fitness-tracker',
  owner: 'prateekjha01',
  scheme: 'fitnesstracker',
  version: '1.0.0',
  // Mobile only (web is a PRD non-goal); stops the dev server offering a web build.
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  // Over-the-air updates only reach builds with the same app version; bump `version`
  // (and rebuild) whenever native code or native config changes.
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.prateekjha.fitnesstracker',
    // Free Apple ID "Personal Team" for local device builds (bun run ios:device).
    appleTeamId: 'BFAQ86SRJM',
    infoPlist: {
      // Only standard HTTPS; skips the export-compliance question on every upload.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.prateekjha.fitnesstracker',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    // Listed BEFORE expo-notifications on purpose: entitlement mods run in reverse order,
    // so this one runs after expo-notifications has added aps-environment.
    './plugins/with-no-push-entitlement',
    'expo-notifications',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 200, backgroundColor: '#000000' },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
});
