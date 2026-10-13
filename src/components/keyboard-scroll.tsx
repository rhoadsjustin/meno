import { createContext, useCallback, useContext, useRef, type ComponentRef } from 'react';
import { ScrollView, type HostInstance, type ScrollViewProps } from 'react-native';

type Reveal = (target: HostInstance | null, spaceBelow?: number) => void;

const RevealContext = createContext<Reveal>(() => {});

/**
 * A screen's scroll view when it holds a text field (practice, review,
 * stitch). It makes room for the keyboard itself — a KeyboardAvoidingView
 * came up short by the native bar's height — and lets a field inside ask to
 * be brought above the keyboard with `useRevealAboveKeyboard`, since the
 * automatic inset alone does not scroll a field that is focused as it mounts.
 */
export function KeyboardScroll(props: ScrollViewProps) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const reveal = useCallback<Reveal>((target, spaceBelow = 0) => {
    if (!target) return;
    ref.current?.scrollResponderScrollNativeHandleToKeyboard(target, spaceBelow, true);
  }, []);
  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={ref}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        {...props}
      />
    </RevealContext.Provider>
  );
}

/**
 * Scrolls the enclosing `KeyboardScroll` so `target` sits above the keyboard
 * with `spaceBelow` points to spare (room for the button under a field).
 * Does nothing outside one.
 */
export function useRevealAboveKeyboard(): Reveal {
  return useContext(RevealContext);
}
