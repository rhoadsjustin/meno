import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { useTranslation } from '@/i18n/react';
import { useThemeColors, fonts } from '@/theme';

/**
 * Native navigation-bar configuration for a stack screen, following Apple's
 * iPhone Duo guidance: navigation controls live in the system bar, so on the
 * cover panel and the opened landscape pose they move to the side with the
 * status bar and tab bar instead of eating vertical space at the top.
 *
 * Renders the header in the surface color with no hairline, a chevron-only
 * back button (text buttons stay in a horizontal bar, so prefer symbols),
 * and either a string title or a custom title view. Put `Stack.Toolbar`
 * items in `children`.
 */
export function ScreenHeader({
  title,
  titleView,
  backHidden = false,
  transparent = false,
  children,
}: {
  title?: string;
  /** A custom view in the title slot, e.g. progress dots. */
  titleView?: ReactNode;
  /** Screens closed with their own Close item hide the system back button. */
  backHidden?: boolean;
  /** No bar background, for screens that draw under the bar themselves. */
  transparent?: boolean;
  children?: ReactNode;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  return (
    <>
      <Stack.Header
        style={{
          backgroundColor: transparent ? 'transparent' : colors.surface,
          shadowColor: 'transparent',
          color: colors.lapis,
        }}
      />
      {titleView ? (
        <Stack.Title asChild>{titleView}</Stack.Title>
      ) : (
        <Stack.Title style={{ color: colors.ink, fontFamily: fonts?.ui }}>
          {title ?? ''}
        </Stack.Title>
      )}
      {backHidden ? (
        <Stack.Screen.BackButton hidden />
      ) : (
        <Stack.Screen.BackButton displayMode="minimal">{t('back')}</Stack.Screen.BackButton>
      )}
      {children}
    </>
  );
}
