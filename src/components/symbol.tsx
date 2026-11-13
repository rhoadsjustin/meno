import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import { useWindowDimensions, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

export type SymbolProps = {
  /** SF Symbol name (iOS). */
  ios: SFSymbol;
  /** The matching Material Symbol (Android, web). */
  android: AndroidSymbol;
  /** Point size at the default text size, matched to the text it sits beside. @default 17 */
  size?: number;
  color: ColorValue;
  /** @default 'regular' */
  weight?: SymbolWeight;
  /** How far the symbol grows with Dynamic Type. @default 2 */
  maxFontSizeMultiplier?: number;
  /** Outer layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

/**
 * An icon inside the app's own views (07 §7: SF Symbols throughout, never an
 * emoji or a typed character): the SF Symbol on iOS, the Material Symbol on
 * Android and web. It takes a theme colour, grows with Dynamic Type like the
 * label next to it, and is hidden from VoiceOver and TalkBack: the row or
 * button around it carries the words.
 *
 * Toolbar icons are a different case; see `useBarIcon`.
 */
export function Symbol({
  ios,
  android,
  size = 17,
  color,
  weight = 'regular',
  maxFontSizeMultiplier = 2,
  style,
}: SymbolProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={Math.round(size * Math.min(fontScale, maxFontSizeMultiplier))}
      tintColor={color}
      weight={weight}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    />
  );
}
