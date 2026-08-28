import * as Notifications from 'expo-notifications';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, useColorScheme, Text, View } from 'react-native';

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

// Anonymous performance/error diagnostics (EAS Observe). Per-route metrics
// via the router integration; must be configured at module scope.
Observe.configure({
  integrations: { 'expo-router': true },
});

// Fatal JS errors → Observe event before RN's default handling (SDK 56's
// expo-observe has no built-in error reporting yet).
const defaultErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((err, isFatal) => {
  try {
    Observe.logEvent('app.fatal_error', {
      severity: 'fatal',
      body: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      attributes: { stack: err instanceof Error ? (err.stack ?? '') : '', isFatal: Boolean(isFatal) },
    });
  } catch {
    // never let reporting break error handling
  }
  defaultErrorHandler(err, isFatal);
});

type BoundaryProps = { children: React.ReactNode };
type BoundaryState = { error: Error | null };

/** Render-phase errors never reach ErrorUtils — catch, report, recover. */
class AppErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      Observe.logEvent('app.render_error', {
        severity: 'error',
        body: `${error.name}: ${error.message}`,
        attributes: { stack: error.stack ?? '', componentStack: info.componentStack ?? '' },
      });
    } catch {
      // reporting must never rethrow
    }
  }

  render() {
    if (this.state.error) {
      return <RecoveryScreen onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function RootLayout() {
  const scheme = useColorScheme();
  const { success, error } = useMigrations();
  const { markInteractive } = useObserve();

  useEffect(() => {
    // TTI: the app is genuinely ready once migrations have run.
    if (success) markInteractive();
  }, [success, markInteractive]);

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
      <AppErrorBoundary>
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
        {/* No swipe-back: leaving the unlock quiz goes through its own
            buttons (Override / close), never a half-dismissed gesture. */}
        <Stack.Screen name="unlock" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

/** Render-error fallback: quiet, recoverable, on-surface — never a dead app. */
function RecoveryScreen({ onRetry }: { onRetry: () => void }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  return (
    <View style={[styles.recovery, { backgroundColor: colors.surface }]}>
      <Text accessibilityRole="alert" style={[styles.recoveryTitle, { color: colors.ink }]}>
        Something went wrong.
      </Text>
      <Text style={[styles.recoveryBody, { color: colors.inkFaint }]}>
        Your verses and progress are safe on this device.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.recoveryButton, { backgroundColor: colors.lapis }]}>
        <Text style={styles.recoveryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recovery: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  recoveryTitle: { fontSize: 20, fontWeight: '600' },
  recoveryBody: { fontSize: 15, textAlign: 'center' },
  recoveryButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  recoveryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});

export default ObserveRoot.wrap(RootLayout);
