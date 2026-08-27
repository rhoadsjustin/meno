import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, useColorScheme, Text, View } from 'react-native';

import { useMigrations } from '@/services/db';
import { maybePresentUnlock, presentUnlock, refreshShieldForCurrentVerse } from '@/services/lock';
import { rescheduleAll } from '@/services/notifications';
import { publishWidgetSnapshot } from '@/services/widgets';
import { palette } from '@/theme/tokens';

const menoLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.light.lapis,
    background: palette.light.surface,
    card: palette.light.surfaceRaised,
    text: palette.light.ink,
    border: palette.light.separator,
  },
};

const menoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.dark.lapis,
    background: palette.dark.surface,
    card: palette.dark.surfaceRaised,
    text: palette.dark.ink,
    border: palette.dark.separator,
  },
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const { success, error } = useMigrations();

  useEffect(() => {
    if (!success) return;
    // Notification taps deep-link into the right screen.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === '/unlock') presentUnlock();
      else if (typeof url === 'string') router.push(url as never);
    });
    // On every foreground: refresh local schedules and, if a shield sent
    // the user here, present the unlock quiz.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void rescheduleAll();
        void maybePresentUnlock();
        void refreshShieldForCurrentVerse();
      } else if (state === 'background') {
        // Publish the widget snapshot on every app close (05 §1).
        void publishWidgetSnapshot();
      }
    });
    void rescheduleAll();
    void maybePresentUnlock();
    void refreshShieldForCurrentVerse();
    return () => {
      responseSub.remove();
      appStateSub.remove();
    };
  }, [success]);

  if (error) {
    // A failed migration means user data is unreadable — surface it rather
    // than rendering screens against a broken schema.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text accessibilityRole="alert">Something went wrong preparing your data: {error.message}</Text>
      </View>
    );
  }
  if (!success) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? menoDarkTheme : menoLightTheme}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="goal-wizard"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="practice/[goalId]" options={{ headerShown: false }} />
        <Stack.Screen name="review/index" options={{ headerShown: false }} />
        <Stack.Screen name="reader/[osis]" options={{ headerShown: false }} />
        <Stack.Screen name="stitch/[goalId]" options={{ headerShown: false }} />
        <Stack.Screen name="lock-setup/index" options={{ headerShown: false }} />
        <Stack.Screen name="unlock" options={{ headerShown: false, gestureEnabled: true }} />
      </Stack>
    </ThemeProvider>
  );
}
