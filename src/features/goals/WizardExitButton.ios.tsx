import { Button, ConfirmationDialog, Host, Text } from '@expo/ui/swift-ui';
import {
  contentShape,
  disabled as disabledModifier,
  dynamicTypeSize,
  font,
  frame,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { WizardExitButtonProps } from '@/features/goals/WizardExitButton';
import { spacing } from '@/theme';

/**
 * Cancel/Back as a system button, so the confirmation dialog has a view to
 * present from: an action sheet on a compact window, a popover on the
 * button on a wide one (iPhone Duo opened). A swipe down on the sheet asks
 * through the same dialog, as a UIKit sheet with unsaved changes does.
 */
export function WizardExitButton({
  label,
  onPress,
  disabled = false,
  confirming,
  onConfirmingChange,
  prompt,
  onDiscard,
  tint,
}: WizardExitButtonProps) {
  return (
    <Host matchContents seedColor={tint} style={styles.host}>
      <ConfirmationDialog
        title={prompt.title}
        titleVisibility="visible"
        isPresented={confirming}
        onIsPresentedChange={onConfirmingChange}>
        <ConfirmationDialog.Trigger>
          <Button
            label={label}
            onPress={onPress}
            modifiers={[
              // The weight of the app's plain button, capped like the rest of
              // the pinned bar (GoalWizard's FOOTER_MAX_SCALE).
              font({ textStyle: 'body', weight: 'semibold' }),
              dynamicTypeSize({ max: 'accessibility1' }),
              // A 44pt target around the label (HIG).
              frame({ minWidth: 44, minHeight: 44 }),
              contentShape(shapes.rectangle()),
              disabledModifier(disabled),
            ]}
          />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button role="destructive" label={prompt.confirm} onPress={onDiscard} />
          <Button role="cancel" label={prompt.keep} />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{prompt.message}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}

const styles = StyleSheet.create({
  // Where the plain Pressable button's label sits (its own padding plus the
  // bar's `footerSecondary`).
  host: { marginHorizontal: spacing.lg + spacing.sm },
});
