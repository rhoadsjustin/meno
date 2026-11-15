import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * The one way a screen asks about Reduce Motion (07 §8: under it, movement
 * becomes a 200ms crossfade).
 *
 * `reduce` is right on the first render — Reanimated reads the setting
 * synchronously at launch, so nothing waits a frame or plays the wrong
 * animation once — and stays right if the setting changes while the app is
 * open, which Reanimated's own hook does not follow.
 *
 * Reanimated's entering / exiting animations need no flag for the usual
 * case: they already skip under Reduce Motion. Reach for `reduce` to choose
 * a different animation, to gate a looping or `withTiming` one, or to pass
 * `animated: !reduce` to a scroll.
 */
export function useMotion(): { reduce: boolean } {
  const atLaunch = useReducedMotion();
  const [reduce, setReduce] = useState(atLaunch);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return { reduce };
}
