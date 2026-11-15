import { Button, ConfirmationDialog, Host, Menu, Text } from '@expo/ui/swift-ui';
import { contentShape, frame, labelStyle, shapes } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { GoalMenuProps } from '@/features/goals/GoalMenu';
import { useTranslation } from '@/i18n/react';

/**
 * The More button (SF Symbol `ellipsis`) as a system menu. Delete and Stop
 * are named in words, with a trash can only on the one that deletes the
 * passage; either opens the system confirmation dialog anchored to the
 * button, whose one action is the destructive one. The dialog's state lives
 * outside the menu, so it outlasts the menu closing.
 */
export function GoalMenu({ label, tint, onShare, onShowOnWidgets, removal }: GoalMenuProps) {
  const { t } = useTranslation('library');
  const [confirming, setConfirming] = useState(false);

  const menu = (
    <Menu
      label={label}
      systemImage="ellipsis"
      modifiers={[
        labelStyle('iconOnly'),
        // A 44pt target around the symbol (HIG).
        frame({ minWidth: 44, minHeight: 44 }),
        contentShape(shapes.rectangle()),
      ]}>
      <Button label={t('goal.share')} systemImage="square.and.arrow.up" onPress={onShare} />
      {onShowOnWidgets && (
        <Button
          label={t('goal.showOnWidgets')}
          systemImage="rectangle.on.rectangle"
          onPress={onShowOnWidgets}
        />
      )}
      {removal && (
        <Button
          role="destructive"
          label={removal.prompt.confirm}
          systemImage={removal.kind === 'delete' ? 'trash' : 'stop.circle'}
          onPress={() => setConfirming(true)}
        />
      )}
    </Menu>
  );

  return (
    <Host matchContents seedColor={tint} style={styles.host}>
      {removal ? (
        <ConfirmationDialog
          title={removal.prompt.title}
          titleVisibility="visible"
          isPresented={confirming}
          onIsPresentedChange={setConfirming}>
          <ConfirmationDialog.Trigger>{menu}</ConfirmationDialog.Trigger>
          <ConfirmationDialog.Actions>
            <Button role="destructive" label={removal.prompt.confirm} onPress={removal.onConfirm} />
          </ConfirmationDialog.Actions>
          <ConfirmationDialog.Message>
            <Text>{removal.prompt.message}</Text>
          </ConfirmationDialog.Message>
        </ConfirmationDialog>
      ) : (
        menu
      )}
    </Host>
  );
}

const styles = StyleSheet.create({
  // The 44pt target overhangs the text line and the card's padding, so the
  // symbol sits on the title's line and on the card's content edge.
  host: { marginVertical: -11, marginEnd: -11 },
});
