/**
 * The signature dissolution moment (docs/07 §1, §8): on tier-up the verse
 * visibly dissolves — full text → first letters → reference — in ≤1.2s.
 * On memorized, it resolves into a gold seal (1.5s, skippable).
 * Reduced motion replaces everything with a 200ms crossfade.
 */
/* eslint-disable react-hooks/immutability --
   Reanimated shared values are mutable by design; the compiler heuristic
   can't tell the skip handler's writes are the animation's cancel path. */
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { firstLetters } from '@/services/practice';
import { useThemeColors, fonts, spacing, scriptureType } from '@/theme';

export function Dissolution({
  text,
  reference,
  memorized,
  onFinished,
}: {
  text: string;
  reference: string;
  memorized: boolean;
  onFinished?: () => void;
}) {
  const colors = useThemeColors();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  const fullOpacity = useSharedValue(1);
  const cipherOpacity = useSharedValue(0);
  const refOpacity = useSharedValue(0);
  const sealScale = useSharedValue(0.8);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    const total = reduceMotion ? 200 : memorized ? 1500 : 1200;
    if (reduceMotion) {
      // Single quiet crossfade (07 §8).
      fullOpacity.value = withTiming(0, { duration: 200 });
      refOpacity.value = withTiming(1, { duration: 200 });
      if (memorized) sealScale.value = 1;
    } else {
      const stage = memorized ? 500 : 600;
      const ease = Easing.inOut(Easing.quad);
      fullOpacity.value = withTiming(0, { duration: stage, easing: ease });
      cipherOpacity.value = withSequence(
        withTiming(1, { duration: stage, easing: ease }),
        withDelay(0, withTiming(0, { duration: stage, easing: ease }))
      );
      refOpacity.value = withDelay(stage, withTiming(1, { duration: stage, easing: ease }));
      if (memorized) {
        sealScale.value = withDelay(
          stage * 2,
          withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) })
        );
      }
    }
    const timer = setTimeout(() => {
      setDone(true);
      onFinished?.();
    }, total);
    return () => clearTimeout(timer);
  }, [reduceMotion, memorized, fullOpacity, cipherOpacity, refOpacity, sealScale, onFinished]);

  const fullStyle = useAnimatedStyle(() => ({ opacity: fullOpacity.value }));
  const cipherStyle = useAnimatedStyle(() => ({ opacity: cipherOpacity.value }));
  const refStyle = useAnimatedStyle(() => ({
    opacity: refOpacity.value,
    transform: [{ scale: memorized ? sealScale.value : 1 }],
  }));

  const skip = useCallback(() => {
    if (done) return;
    // Jump every layer to its end state (skippable per 07 §8).
    fullOpacity.value = withTiming(0, { duration: 80 });
    cipherOpacity.value = withTiming(0, { duration: 80 });
    refOpacity.value = withTiming(1, { duration: 80 });
    sealScale.value = withTiming(1, { duration: 80 });
    setDone(true);
    onFinished?.();
  }, [done, fullOpacity, cipherOpacity, refOpacity, sealScale, onFinished]);

  return (
    // Skippable, never blocks input for >1.5s (07 §8).
    <Pressable
      accessibilityLabel={
        memorized
          ? `${reference} is memorized — the text now lives in you.`
          : 'The verse dissolves as it moves into memory.'
      }
      onPress={skip}
      style={styles.stage}>
      <Animated.View style={[styles.layer, fullStyle]}>
        <Text style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {text}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.layer, cipherStyle]}>
        <Text style={[styles.cipher, { color: colors.inkFaint, fontFamily: fonts?.mono }]}>
          {firstLetters(text)}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.layer, refStyle]}>
        <View style={styles.refWrap}>
          <Text
            style={[
              styles.reference,
              { color: memorized ? colors.gold : colors.ink, fontFamily: fonts?.scripture },
            ]}>
            {reference}
          </Text>
          {memorized && (
            <Text style={[styles.sealNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              Hidden in your heart.
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 140, justifyContent: 'center' },
  layer: { position: 'absolute', left: 0, right: 0 },
  scripture: {
    fontSize: scriptureType.minSize,
    lineHeight: 26,
  },
  cipher: { fontSize: 15, lineHeight: 24 },
  refWrap: { alignItems: 'center', gap: spacing.sm },
  reference: { fontSize: 30, textAlign: 'center' },
  sealNote: { fontSize: 14 },
});
