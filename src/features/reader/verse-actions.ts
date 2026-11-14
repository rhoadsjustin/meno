import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { t } from '@/i18n';

/**
 * What a long-press on a verse offers (docs/07 §6): "Memorize this…". The
 * system's action sheet on iOS and a dialog on Android, titled with the
 * verse's reference. `onClose` runs however it ends, chosen or cancelled.
 */
export function showVerseActions({
  title,
  onMemorize,
  onClose,
}: {
  title: string;
  onMemorize: () => void;
  onClose: () => void;
}) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [t('reader:memorize'), t('common:cancel')], cancelButtonIndex: 1 },
      (index) => {
        onClose();
        if (index === 0) onMemorize();
      },
    );
    return;
  }
  Alert.alert(
    title,
    undefined,
    [
      { text: t('common:cancel'), style: 'cancel', onPress: onClose },
      {
        text: t('reader:memorize'),
        onPress: () => {
          onClose();
          onMemorize();
        },
      },
    ],
    { cancelable: true, onDismiss: onClose },
  );
}
