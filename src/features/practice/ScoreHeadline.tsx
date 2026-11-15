import { useEffect, useState } from 'react';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { useContentLayout } from '@/components/content-layout';
import { useTranslation } from '@/i18n/react';
import { fonts, displayType, spacing } from '@/theme';
import { useMotion } from '@/theme/motion';

const COUNT_UP_MS = 400;

/**
 * The large score over a graded result — practice, review and stitch share
 * it. `accuracy` is 0–1. VoiceOver reads `label` (the final value, whatever
 * the numeral is showing).
 *
 * `countUp` runs the numeral up to its value over 400ms (07 §8, "item
 * passed"); under Reduce Motion it is simply shown. It is capped at 1.5× text
 * size: the numeral is already display-sized, and uncapped "100%" outgrew a
 * phone column at the accessibility sizes.
 */
export function ScoreHeadline({
  accuracy,
  color,
  label,
  countUp = false,
}: {
  accuracy: number;
  color: ColorValue;
  label: string;
  countUp?: boolean;
}) {
  const { t } = useTranslation('common');
  // A short window (iPhone Duo opened is 669pt high): the score takes less
  // room so the result's actions stay on screen.
  const { short } = useContentLayout();
  const { reduce } = useMotion();
  const value = Math.round(accuracy * 100);
  const animate = countUp && !reduce && value > 0;
  // Decided as the result appears: the numeral starts at 0 only if it is
  // going to move.
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) return;
    let frame: number;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      // Ease out: quick off the mark, settling onto the score.
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, value]);

  return (
    <Text
      // Maestro flow 03 checks by id that an ungraded round shows no score:
      // a bare "\d+%" also matches the progress bar's value.
      testID="round-score"
      accessibilityLabel={label}
      maxFontSizeMultiplier={1.5}
      style={[styles.score, short && styles.scoreShort, { color, fontFamily: fonts?.scripture }]}>
      {t('percent', { value: animate ? shown : value })}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Fixed-width digits, so the numeral does not shift as it counts.
  score: { fontSize: displayType.medium, marginTop: spacing.xl, fontVariant: ['tabular-nums'] },
  scoreShort: { fontSize: 44, marginTop: 0 },
});
