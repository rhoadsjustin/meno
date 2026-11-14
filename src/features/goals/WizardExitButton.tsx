import { useEffect, useEffectEvent } from 'react';
import { Alert, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';

/** The words of the "discard this passage?" confirmation. */
export type DiscardPrompt = {
  title: string;
  message: string;
  /** The destructive action, "Discard". */
  confirm: string;
  /** The way back to the wizard, "Keep editing". */
  keep: string;
};

export type WizardExitButtonProps = {
  /** "Cancel" on the passage step, "Back" on the plan. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** The wizard was asked to close (Cancel, a swipe down) with a passage chosen. */
  confirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
  prompt: DiscardPrompt;
  /** Runs once Discard is tapped. */
  onDiscard: () => void;
  tint: ColorValue;
  /** Cap on Dynamic Type growth, shared with the bar's other button. */
  maxFontSizeMultiplier?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The goal wizard's Cancel/Back button, which also owns the confirmation
 * shown before a chosen passage is thrown away. iOS presents the system
 * confirmation dialog from the button (`WizardExitButton.ios.tsx`);
 * elsewhere the platform alert stands in.
 */
export function WizardExitButton({
  label,
  onPress,
  disabled,
  confirming,
  onConfirmingChange,
  prompt,
  onDiscard,
  maxFontSizeMultiplier,
  style,
}: WizardExitButtonProps) {
  const ask = useEffectEvent(() => {
    Alert.alert(
      prompt.title,
      prompt.message,
      [
        { text: prompt.keep, style: 'cancel', onPress: () => onConfirmingChange(false) },
        {
          text: prompt.confirm,
          style: 'destructive',
          onPress: () => {
            onConfirmingChange(false);
            onDiscard();
          },
        },
      ],
      { cancelable: true, onDismiss: () => onConfirmingChange(false) },
    );
  });
  useEffect(() => {
    if (confirming) ask();
  }, [confirming]);

  return (
    <Button
      variant="plain"
      label={label}
      disabled={disabled}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      onPress={onPress}
      style={style}
    />
  );
}
