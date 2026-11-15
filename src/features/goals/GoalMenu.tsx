import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';
import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, type ColorValue } from 'react-native';

import { SymbolIcon } from '@/components/symbol';
import { t } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import type { DeletePrompt } from '@/services/goals/deletion';

export type GoalMenuProps = {
  /** Spoken name of the button, e.g. "More actions for Psalm 23". */
  label: string;
  tint: ColorValue;
  onShare: () => void;
  /** Left out for the passage already on the widgets, and when it is the only one. */
  onShowOnWidgets?: () => void;
  /** Taking the passage off the shelf (services/goals/deletion): `delete`
   * removes it, `stop` keeps its memorized chunks. Left out when neither
   * applies. Asks first, with `prompt`. */
  removal?: {
    kind: 'delete' | 'stop';
    prompt: DeletePrompt;
    /** Runs once the destructive button in the confirmation is tapped. */
    onConfirm: () => void;
  };
};

/**
 * A goal card's More button: the actions that are not the day's step (share
 * as a challenge, show on widgets, delete or stop). iOS shows the system menu
 * and a confirmation dialog anchored to the button (`GoalMenu.ios.tsx`);
 * elsewhere a Material dropdown opens from the button and the platform alert
 * confirms.
 */
export function GoalMenu({ label, tint, onShare, onShowOnWidgets, removal }: GoalMenuProps) {
  const { t: tl } = useTranslation('library');
  const menu = useRef<MenuComponentRef>(null);

  const actions: MenuAction[] = [{ id: 'share', title: tl('goal.share') }];
  if (onShowOnWidgets) actions.push({ id: 'widgets', title: tl('goal.showOnWidgets') });
  if (removal) {
    actions.push({
      id: 'remove',
      title: removal.prompt.confirm,
      attributes: { destructive: true },
    });
  }

  const run = (id: string) => {
    if (id === 'share') onShare();
    else if (id === 'widgets') onShowOnWidgets?.();
    else if (id === 'remove' && removal) {
      Alert.alert(removal.prompt.title, removal.prompt.message, [
        { text: t('common:cancel'), style: 'cancel' },
        { text: removal.prompt.confirm, style: 'destructive', onPress: removal.onConfirm },
      ]);
    }
  };

  return (
    <MenuView
      ref={menu}
      actions={actions}
      onPressAction={(e) => run(e.nativeEvent.event)}
      style={styles.overhang}>
      {/* The button opens the menu itself, so a screen reader's activation
          reaches it as well as a touch. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => menu.current?.show()}
        style={styles.target}>
        <SymbolIcon ios="ellipsis" android="more_horiz" size={22} color={tint} />
      </Pressable>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  // A 44pt target that overhangs the title's line and the card's padding.
  overhang: { marginVertical: -11, marginEnd: -11 },
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
