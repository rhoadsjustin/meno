import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, type ColorValue } from 'react-native';

import type { DeletePrompt } from '@/services/goals/deletion';

export type DeleteGoalButtonProps = {
  /** Spoken name of the button, e.g. "Delete Psalm 23" or "Stop Psalm 23". */
  label: string;
  /** What the action removes and keeps (services/goals `deleteGoalPrompt`,
   * `stopGoalPrompt`). */
  prompt: DeletePrompt;
  /** Runs once the destructive button in the confirmation is tapped. */
  onConfirm: () => void;
  tint: ColorValue;
};

/**
 * A goal card's trash button, which deletes a passage or stops one partway.
 * It asks first: iOS shows the system confirmation dialog anchored to the
 * button (`DeleteGoalButton.ios.tsx`); elsewhere the platform alert stands in.
 */
export function DeleteGoalButton({ label, prompt, onConfirm, tint }: DeleteGoalButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() =>
        Alert.alert(prompt.title, prompt.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: prompt.confirm, style: 'destructive', onPress: onConfirm },
        ])
      }
      style={styles.target}>
      <SymbolView
        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
        tintColor={tint}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A 44pt target that overhangs the title's line and the card's padding.
  target: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -11,
    marginEnd: -11,
  },
});
