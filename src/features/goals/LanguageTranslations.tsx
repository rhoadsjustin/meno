/**
 * One language's translations, pushed from the picker's language list. The
 * bar's back chevron returns to the list; picking a translation closes the
 * whole picker.
 */
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ScreenHeader } from '@/components/screen-header';
import { useCatalogSections } from '@/features/goals/translation-catalog';
import { useTranslationChoice } from '@/features/goals/translation-choice';
import { closePicker, type PickerSection } from '@/features/goals/translation-picker-nav';
import { GroupFooter, GroupHeader, TranslationRow } from '@/features/goals/translation-rows';
import { useTranslation } from '@/i18n/react';
import { useThemeColors, layout, spacing } from '@/theme';

export function LanguageTranslations() {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  const { insets, sides } = useContentLayout();
  const navigation = useNavigation();
  const { language, selected } = useLocalSearchParams<{ language: string; selected?: string }>();
  const choose = useTranslationChoice((s) => s.choose);
  const { sections } = useCatalogSections(selected);
  const section = sections.find((s) => s.languageId === language);

  const listSections = useMemo<PickerSection[]>(
    () =>
      section
        ? [
            {
              key: section.languageId,
              title: t('picker.translationCount', { count: section.translations.length }),
              data: section.translations.map((translation) => ({
                kind: 'translation',
                translation,
              })),
            },
          ]
        : [],
    [section, t],
  );

  const pick = useCallback(
    (id: string) => {
      choose(id);
      closePicker(navigation);
    },
    [choose, navigation],
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={section?.title ?? ''} />
      <SectionList
        sections={listSections}
        keyExtractor={(item) =>
          item.kind === 'translation' ? item.translation.id : item.language.id
        }
        renderItem={({ item, index, section: s }) =>
          item.kind === 'translation' ? (
            <TranslationRow
              translation={item.translation}
              selected={item.translation.id === selected}
              position={{ first: index === 0, last: index === s.data.length - 1 }}
              onPress={() => pick(item.translation.id)}
            />
          ) : null
        }
        renderSectionHeader={({ section: s }) => <GroupHeader title={s.title} />}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={<GroupFooter>{t('picker.footnote')}</GroupFooter>}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          contentColumn,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.screenMargin - spacing.xs },
});
