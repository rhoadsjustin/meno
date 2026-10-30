/**
 * "How to set up Meno" (Settings → first row) as a modal: the shared
 * HelpGuide under a title, with a Done bar. On wide windows Settings shows
 * the same guide in its detail pane instead, so this route is the phone path.
 */
import { useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ModalSafeArea } from '@/components/modal-safe-area';
import { HelpGuide } from '@/features/help/HelpGuide';
import { useTranslation } from '@/i18n/react';
import { useThemeColors, fonts, layout, spacing } from '@/theme';

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
  // Insets are this modal's own (ModalSafeArea). In a sheet the top one is
  // zero; shown full-screen it is the status bar's, which Done must clear.
  // The side insets matter on iPhone Duo's cover panel, where the status bar
  // is a strip down one side: without them Done sits underneath it.
  const { insets, sides } = useContentLayout();
  const { top } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const scrollTo = useCallback(
    (y: number) => scrollRef.current?.scrollTo({ y, animated: !reduceMotion }),
    [reduceMotion],
  );

  const text = { color: colors.ink, fontFamily: fonts?.ui };
  const faint = { color: colors.inkFaint, fontFamily: fonts?.ui };

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <View style={[styles.topBar, { paddingTop: top + spacing.lg }]}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={closeModal}>
          <Text style={[styles.done, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('common:done')}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          contentColumn,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}>
        <Text accessibilityRole="header" style={[styles.title, text]}>
          {t('title')}
        </Text>
        <Text style={[styles.body, faint]}>{t('intro')}</Text>
        <HelpGuide scrollTo={scrollTo} onBeforeNavigate={closeModal} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenMargin,
    paddingBottom: spacing.sm,
  },
  done: { fontSize: 17, fontWeight: '600' },
  content: { paddingHorizontal: layout.screenMargin, gap: spacing.lg },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
});
