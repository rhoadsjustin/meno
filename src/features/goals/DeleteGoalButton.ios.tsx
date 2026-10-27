import { Button, ConfirmationDialog, Host, Text } from '@expo/ui/swift-ui';
import { contentShape, frame, labelStyle, shapes } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { DeleteGoalButtonProps } from '@/features/goals/DeleteGoalButton';

/**
 * The trash button (SF Symbol `trash`). Tapping it opens the system
 * confirmation dialog anchored to the button, whose one action is the
 * destructive delete; tapping outside it cancels.
 */
export function DeleteGoalButton({ label, prompt, onDelete, tint }: DeleteGoalButtonProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Host matchContents seedColor={tint} style={styles.host}>
      <ConfirmationDialog
        title={prompt.title}
        titleVisibility="visible"
        isPresented={confirming}
        onIsPresentedChange={setConfirming}>
        <ConfirmationDialog.Trigger>
          <Button
            label={label}
            systemImage="trash"
            onPress={() => setConfirming(true)}
            modifiers={[
              labelStyle('iconOnly'),
              // A 44pt target around the symbol (HIG).
              frame({ minWidth: 44, minHeight: 44 }),
              contentShape(shapes.rectangle()),
            ]}
          />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button role="destructive" label={prompt.confirm} onPress={onDelete} />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{prompt.message}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}

const styles = StyleSheet.create({
  // The 44pt target overhangs the text line and the card's padding, so the
  // symbol sits on the title's line and on the card's content edge.
  host: { marginVertical: -11, marginEnd: -11 },
});
