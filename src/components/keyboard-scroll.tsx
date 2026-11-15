import { createContext, useCallback, useContext, useRef, type ComponentRef } from 'react';
import {
  Platform,
  ScrollView,
  type HostInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

import { useMotion } from '@/theme/motion';

/** Scrolls so `target` ends `margin` points above `keyboardTop` (window y). */
type Reveal = (target: HostInstance | null, keyboardTop: number, margin?: number) => void;

const RevealContext = createContext<Reveal>(() => {});

/**
 * A screen's scroll view when it holds a text field (practice, review,
 * stitch). It makes room for the keyboard itself — a KeyboardAvoidingView
 * came up short by the native bar's height — and lets a field ask for
 * something below it (the Check button) to be brought above the keyboard
 * with `useRevealAboveKeyboard`, since the automatic inset alone does not
 * scroll a field that is focused as it mounts.
 */
export function KeyboardScroll({ onScroll, ...props }: ScrollViewProps) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const trackScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );
  const { reduce } = useMotion();
  const reveal = useCallback<Reveal>((target, keyboardTop, margin = 12) => {
    target?.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + margin - keyboardTop;
      if (overlap > 0) ref.current?.scrollTo({ y: offset.current + overlap, animated: !reduce });
    });
  }, [reduce]);
  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={ref}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        // Dragging the content down puts the keyboard away (Type has no Done
        // key: Return is a new line). `reveal` scrolls in code, which does not.
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        scrollEventThrottle={16}
        onScroll={trackScroll}
        {...props}
      />
    </RevealContext.Provider>
  );
}

/**
 * Scrolls the enclosing `KeyboardScroll` so `target` sits above the keyboard.
 * Does nothing outside one.
 */
export function useRevealAboveKeyboard(): Reveal {
  return useContext(RevealContext);
}
