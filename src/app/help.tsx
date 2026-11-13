/**
 * "How to set up Meno" (Settings → first row) as a modal: the shared
 * HelpGuide under the native bar, which carries the title and Done. On wide
 * windows Settings shows the same guide in its detail pane instead, so this
 * route is the phone path.
 */
import { Stack } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { useBarIcon } from '@/components/bar-icon';
import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { ScreenHeader } from '@/components/screen-header';
import { HelpGuide } from '@/features/help/HelpGuide';
import { useTranslation } from '@/i18n/react';
import { useThemeColors, fonts, layout, spacing } from '@/theme';
import { useMotion } from '@/theme/motion';

export default function HelpRoute() {
  return (
    <ModalSafeArea>
      <Help />
    </ModalSafeArea>
  );
}

function Help() {
  const colors = useThemeColors();
  const { t } = useTranslation(['help', 'common']);
  // Insets are this modal's own (ModalSafeArea). The title and Done sit in
  // the native bar, which clears the status bar by itself — including on
  // iPhone Duo's cover panel, where the status bar is a strip down one side
  // and the system moves the bar's items with it.
  const { insets, sides } = useContentLayout();
  const doneIcon = useBarIcon('checkmark', 'check');
  const { reduce: reduceMotion } = useMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const scrollTo = useCallback(
    (y: number) => scrollRef.current?.scrollTo({ y, animated: !reduceMotion }),
    [reduceMotion],
  );

  const faint = { color: colors.inkFaint, fontFamily: fonts?.ui };

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScreenHeader backHidden title={t('title')}>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            variant="done"
            icon={doneIcon}
            accessibilityLabel={t('common:done')}
            onPress={closeModal}>
            {t('common:done')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          contentColumn,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}>
        <Text style={[styles.body, faint]}>{t('intro')}</Text>
        <HelpGuide scrollTo={scrollTo} onBeforeNavigate={closeModal} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenMargin,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  body: { fontSize: 16, lineHeight: 23 },
});
