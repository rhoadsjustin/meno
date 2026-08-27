import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Text, View } from 'react-native';

import { useMigrations } from '@/services/db';
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
        <Stack.Screen name="practice/[goalId]" options={{ headerShown: false }} />
        <Stack.Screen name="reader/[osis]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
