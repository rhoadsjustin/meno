import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, type ColorValue } from 'react-native';

import type { DeletePrompt } from '@/services/goals/deletion';

export type DeleteGoalButtonProps = {
  /** Spoken name of the button, e.g. "Delete Psalm 23". */
  label: string;
  /** What deleting removes (services/goals `deleteGoalPrompt`). */
  prompt: DeletePrompt;
  onDelete: () => void;
  tint: ColorValue;
};

/**
 * A goal card's trash button. It asks before deleting: iOS shows the system
 * confirmation dialog anchored to the button (`DeleteGoalButton.ios.tsx`);
 * elsewhere the platform alert stands in.
 */
export function DeleteGoalButton({ label, prompt, onDelete, tint }: DeleteGoalButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() =>
        Alert.alert(prompt.title, prompt.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: prompt.confirm, style: 'destructive', onPress: onDelete },
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
