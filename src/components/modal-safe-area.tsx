import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Safe-area insets measured for a modal route rather than for the window
 * behind it. Without this a modal reads the root provider's insets, which is
 * wrong on iPhone Duo in two ways:
 *
 * - A form sheet on the inner panel is centred and touches neither side, but
 *   the window's insets include the status strip, so its content was padded
 *   on one side only. (On the cover panel the same sheet is full-width and
 *   does sit under the strip; the sheet's own insets say so.)
 * - A full-screen modal takes the root view out of the window, so the root
 *   provider stops hearing about changes: rotate or fold with the modal up
 *   and it kept the previous pose's insets.
 *
 * A provider inside the modal reports the modal's own overlap, so
 * `useContentLayout()` is correct in every pose.
 */
export function ModalSafeArea({ children }: PropsWithChildren) {
  return <SafeAreaProvider style={styles.root}>{children}</SafeAreaProvider>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
