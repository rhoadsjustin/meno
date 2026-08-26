import { useColorScheme } from 'react-native';

import { palette, type ColorScheme, type ThemeColors } from '@/theme/tokens';

export * from '@/theme/tokens';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  const resolved: ColorScheme = scheme === 'dark' ? 'dark' : 'light';
  return palette[resolved];
}
