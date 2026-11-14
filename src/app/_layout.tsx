import * as Notifications from 'expo-notifications';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, useColorScheme, Text, View } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ReservedRegionsProvider } from '@modules/reserved-regions';
import { applyDeviceLocale } from '@/i18n/device';
import { useTranslation } from '@/i18n/react';
import { fillPlaceholders, loadCatalog, purgeUnreferencedText } from '@/services/bible';
import { useMigrations } from '@/services/db';
import { maybePresentUnlock, presentUnlock, refreshShieldForCurrentVerse } from '@/services/lock';
import { rescheduleAll } from '@/services/notifications';
import { tapNavigation } from '@/services/notifications/tap';
import { useUpdateLifecycle } from '@/services/updates';
import { publishSiriContext } from '@/services/siri';
import { publishWidgetSnapshot } from '@/services/widgets';
import { palette, radius, spacing } from '@/theme/tokens';

// Before any screen renders or any service formats a string.
applyDeviceLocale();

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
      attributes: {
        stack: err instanceof Error ? (err.stack ?? '') : '',
        isFatal: Boolean(isFatal),
      },
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

// A link that cold-starts the app (meno://help, a widget, a challenge) still
// gets the tabs underneath, so the screen it opens is presented as usual and
// closing it lands on Today instead of leaving nothing to go back to.
export const unstable_settings = { anchor: '(tabs)' };

function RootLayout() {
  const scheme = useColorScheme();
  const { t } = useTranslation('app');
  const { success, error } = useMigrations();
  const { markInteractive } = useObserve();
  // Over-the-air updates: download on return to the app, offer a restart for
  // critical fixes (docs/ship/ota-updates.md). No-op in Debug builds.
  useUpdateLifecycle(scheme === 'dark' ? 'dark' : 'light');
  // The translation catalog cache names the versions goals use (02 §5), so
  // screens wait for it as they wait for migrations. An unreadable cache
  // still lets the app open — those goals show a placeholder name.
  const [catalogReady, setCatalogReady] = useState(false);
  // The route in front, for the notification listener below.
  const currentPath = usePathname();
  const pathname = useRef(currentPath);
  useEffect(() => {
    pathname.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    void loadCatalog()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        setCatalogReady(true);
        void fillPlaceholders().catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, [success]);

  useEffect(() => {
    // TTI: the app is genuinely ready once migrations and the catalog have loaded.
    if (success && catalogReady) markInteractive();
  }, [success, catalogReady, markInteractive]);

  useEffect(() => {
    if (!success) return;
    // Notification taps deep-link into the right screen.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === '/unlock') presentUnlock();
      else if (typeof url === 'string') {
        // Not on top of whatever is open: a second /review over the first,
        // or a reminder over a sheet, left stale screens to walk back through.
        const how = tapNavigation(pathname.current, url);
        if (how === 'stay') return;
        if (how === 'reset' && router.canDismiss()) router.dismissAll();
        router.push(url as never);
      }
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
        // Siri is asked once the app is out of front; hand it the current
        // translation before then (services/siri).
        void publishSiriContext();
      }
    });
    void rescheduleAll();
    void maybePresentUnlock();
    void refreshShieldForCurrentVerse();
    // Licensed text no goal covers any more goes at launch (02 §5).
    void purgeUnreferencedText().catch(() => {});
    // Launch is also when a language change lands (iOS relaunches the app),
    // so re-render the widget's copy now rather than at the next close.
    void publishWidgetSnapshot();
    void publishSiriContext();
    return () => {
      responseSub.remove();
      appStateSub.remove();
    };
  }, [success]);

  // The exception's own words go to diagnostics, never the screen.
  useEffect(() => {
    if (!error) return;
    try {
      Observe.logEvent('app.migration_error', {
        severity: 'fatal',
        body: `${error.name}: ${error.message}`,
        attributes: { stack: error.stack ?? '' },
      });
    } catch {
      // reporting must never rethrow
    }
  }, [error]);

  if (error) {
    // A failed migration means user data is unreadable — say so in plain
    // words rather than rendering screens against a broken schema. Plain RN
    // on the palette, so it renders when nothing else has.
    return (
      <RecoveryScreen
        title={t('migrationError.title')}
        body={t('migrationError.body')}
        onRetry={() => void Updates.reloadAsync().catch(() => {})}
      />
    );
  }
  if (!success || !catalogReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? menoDarkTheme : menoLightTheme}>
        <StatusBar style="auto" />
        <AppErrorBoundary>
          {/* Publishes iPhone Duo's folding region and cameras to layouts. */}
          <ReservedRegionsProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="goal-wizard"
                options={{ presentation: 'modal', headerShown: false }}
              />
              {/* Challenge and Help put their dismiss control and title in the
            native bar in-page (ScreenHeader + Stack.Toolbar). */}
              <Stack.Screen name="challenge" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="help" options={{ presentation: 'modal', title: '' }} />
              {/* Opened from the goal wizard (itself a sheet); hands its
            choice back through features/goals/translation-choice. */}
              <Stack.Screen
                name="translation-picker"
                options={{ presentation: 'modal', headerShown: false }}
              />
              {/* Year in the Word (docs/10): full screen, its own native bar
            (Close, Share) configured in-page. */}
              <Stack.Screen name="wrapped" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen
                name="onboarding"
                options={{
                  presentation: 'fullScreenModal',
                  // The bar (Back, Skip, page dots) is configured in-page.
                  title: '',
                  gestureEnabled: false,
                }}
              />
              {/* Practice, review, reader and stitch configure their own native
            header items in-page (ScreenHeader + Stack.Toolbar), so the
            controls follow the system's vertical bar on iPhone Duo. */}
              <Stack.Screen name="practice/[goalId]" />
              {/* A redirect only (widget and reminder taps): no bar, or its
            route name flashes as a title on the way through. */}
              <Stack.Screen name="practice/index" options={{ headerShown: false }} />
              <Stack.Screen name="review/index" />
              <Stack.Screen name="reader/[osis]" />
              <Stack.Screen name="stitch/[goalId]" />
              {/* Lock setup shows the bar on every step (ScreenHeader in-page),
            so the explainer has a visible way back. */}
              <Stack.Screen name="lock-setup/index" options={{ title: '' }} />
              {/* A blocking task, so it is presented full screen over whatever
            is up (a sheet included) rather than pushed beside it. No
            swipe-dismiss: leaving the unlock quiz goes through its own
            buttons (Override / close), never a half-dismissed gesture. */}
              <Stack.Screen
                name="unlock"
                options={{
                  presentation: 'fullScreenModal',
                  // The bar (Back, Skip, page dots) is configured in-page.
                  title: '',
                  gestureEnabled: false,
                }}
              />
            </Stack>
          </ReservedRegionsProvider>
        </AppErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Render-error fallback: quiet, recoverable, on-surface — never a dead app. */
function RecoveryScreen({
  onRetry,
  title,
  body,
}: {
  onRetry: () => void;
  /** Defaults to the render-error copy. */
  title?: string;
  body?: string;
}) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  const { t } = useTranslation(['app', 'common']);
  return (
    <View style={[styles.recovery, { backgroundColor: colors.surface }]}>
      <Text accessibilityRole="alert" style={[styles.recoveryTitle, { color: colors.ink }]}>
        {title ?? t('recovery.title')}
      </Text>
      <Text style={[styles.recoveryBody, { color: colors.inkFaint }]}>
        {body ?? t('recovery.body')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.recoveryButton,
          { backgroundColor: colors.lapis },
          pressed && styles.recoveryButtonPressed,
        ]}>
        <Text style={[styles.recoveryButtonText, { color: colors.onLapis }]}>
          {t('common:retry')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recovery: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm },
  recoveryTitle: { fontSize: 20, fontWeight: '600' },
  recoveryBody: { fontSize: 15, textAlign: 'center' },
  recoveryButton: {
    marginTop: spacing.lg,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  recoveryButtonPressed: { opacity: 0.6 },
  recoveryButtonText: { fontSize: 17, fontWeight: '600' },
});

export default ObserveRoot.wrap(RootLayout);
