import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { useThemeColors, fonts, textStyle } from '@/theme';

export type SectionHeaderProps = {
  title: string;
  /**
   * `section` names a group of content below it and is a VoiceOver heading.
   * `kicker` is the small line over a card's own title: the title is the
   * heading, so the kicker reads as plain text.
   * @default 'section'
   */
  kind?: 'section' | 'kicker';
  /** `accent` is lapis, for the one label that marks the focus passage. @default 'quiet' */
  tone?: 'quiet' | 'accent';
  /** Outer layout only (margins, padding). */
  style?: StyleProp<TextStyle>;
};

/**
 * The small tracked uppercase label over a group or a card title. One
 * component so the size, tracking and case are decided in one place: the
 * strings stay sentence case (07 §9) and the capitals are styling.
 */
export function SectionHeader({ title, kind = 'section', tone = 'quiet', style }: SectionHeaderProps) {
  const colors = useThemeColors();
  return (
    <Text
      accessibilityRole={kind === 'section' ? 'header' : undefined}
      style={[
        kind === 'section' ? styles.section : styles.kicker,
        { color: tone === 'accent' ? colors.lapis : colors.inkFaint, fontFamily: fonts?.ui },
        style,
      ]}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  section: {
    ...textStyle.footnote,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kicker: {
    ...textStyle.caption1,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
