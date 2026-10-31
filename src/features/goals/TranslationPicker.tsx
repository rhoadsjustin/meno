/**
 * Translation picker (docs/02 §5, 07 §6), the first screen of the picker's
 * own stack. Only languages that have a translation Meno can read are
 * listed: the current choice's language, the device's language and English
 * open at the top with their translations; every other language is one row
 * with its count, opening its translations on the next screen.
 *
 * The search field lives in the navigation bar (HIG Search fields; Material
 * search on Android) and searches every translation and language at once,
 * so nothing has to be opened before it can be found.
 *
 * Opening the picker checks for new translations (see its layout); the row
 * at the top says so, then how many arrived or why it failed, and the
 * refresh button in the bar checks again on demand.
 *
 * A modal over the goal wizard's sheet; the choice travels back through
 * features/goals/translation-choice.
 */
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View, type SectionListRenderItem } from 'react-native';

import { useBarIcon } from '@/components/bar-icon';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ScreenHeader } from '@/components/screen-header';
import {
  closePicker,
  type PickerItem,
  type PickerSection,
} from '@/features/goals/translation-picker-nav';
import { useCatalogSections, useTranslationCatalog } from '@/features/goals/translation-catalog';
import { useTranslationChoice } from '@/features/goals/translation-choice';
import {
  CatalogStatusRow,
  GroupFooter,
  GroupHeader,
  LanguageRow,
  NoResults,
  RefreshStatusRow,
  TranslationRow,
} from '@/features/goals/translation-rows';
import { useTranslation } from '@/i18n/react';
import { searchCatalog, summarizeLanguages, youversionKeyConfigured } from '@/services/bible';
import { useThemeColors, layout, spacing } from '@/theme';

export function TranslationPicker() {
  const colors = useThemeColors();
  const { t } = useTranslation(['goals', 'common']);
  const { insets, sides } = useContentLayout();
  const navigation = useNavigation();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const choose = useTranslationChoice((s) => s.choose);
  const closeIcon = useBarIcon('xmark', 'close');
  const refreshIcon = useBarIcon('arrow.clockwise', 'refresh');
  const status = useTranslationCatalog((s) => s.status);
  const load = useTranslationCatalog((s) => s.load);
  const refresh = useTranslationCatalog((s) => s.refresh);
  const checking = status === 'loading' || refresh.state === 'checking';
  const { sections, featured } = useCatalogSections(selected);
  const [query, setQuery] = useState('');

  const close = useCallback(() => closePicker(navigation), [navigation]);
  const pick = useCallback(
    (id: string) => {
      choose(id);
      close();
    },
    [choose, close],
  );

  const searching = query.trim().length > 0;
  const listSections = useMemo<PickerSection[]>(() => {
    if (searching) {
      const found = searchCatalog(sections, query);
      const out: PickerSection[] = [];
      if (found.translations.length > 0) {
        out.push({
          key: 'translations',
          title: t('picker.translations'),
          data: found.translations.map((hit) => ({
            kind: 'translation',
            translation: hit.translation,
            languageTitle: hit.languageTitle,
          })),
        });
      }
      if (found.languages.length > 0) {
        out.push({
          key: 'languages',
          title: t('picker.languages'),
          data: found.languages.map((language) => ({ kind: 'language', language })),
        });
      }
      return out;
    }
    const featuredSet = new Set(featured);
    const out: PickerSection[] = featured.map((id) => {
      const s = sections.find((x) => x.languageId === id)!;
      return {
        key: id,
        title: s.title,
        data: s.translations.map((translation) => ({ kind: 'translation', translation })),
      };
    });
    const others = summarizeLanguages(sections.filter((s) => !featuredSet.has(s.languageId)));
    others.sort((a, b) => a.title.localeCompare(b.title));
    if (others.length > 0) {
      out.push({
        key: 'other',
        title: t('picker.otherLanguages'),
        data: others.map((language) => ({ kind: 'language', language })),
      });
    }
    return out;
  }, [searching, sections, featured, query, t]);

  const renderItem: SectionListRenderItem<PickerItem, PickerSection> = ({
    item,
    index,
    section,
  }) => {
    const position = { first: index === 0, last: index === section.data.length - 1 };
    if (item.kind === 'translation') {
      return (
        <TranslationRow
          translation={item.translation}
          languageTitle={item.languageTitle}
          selected={item.translation.id === selected}
          position={position}
          onPress={() => pick(item.translation.id)}
        />
      );
    }
    return (
      <LanguageRow
        language={item.language}
        position={position}
        onPress={() =>
          router.push({
            pathname: '/translation-picker/[language]',
            params: { language: item.language.id, ...(selected ? { selected } : {}) },
          })
        }
      />
    );
  };

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScreenHeader backHidden title={t('passage.translation')}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={closeIcon}
            accessibilityLabel={t('common:cancel')}
            onPress={close}>
            {t('common:cancel')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
        {youversionKeyConfigured() && (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon={refreshIcon}
              accessibilityLabel={t('picker.refresh')}
              disabled={checking}
              onPress={() => void load({ versionsMaxAge: 0 })}>
              {t('picker.refresh')}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        )}
      </ScreenHeader>
      <Stack.SearchBar
        placeholder={t('picker.search')}
        autoCapitalize="none"
        hideWhenScrolling={false}
        tintColor={colors.lapis}
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        onClose={() => setQuery('')}
      />
      <SectionList
        sections={listSections}
        keyExtractor={(item) =>
          item.kind === 'translation' ? item.translation.id : `language:${item.language.id}`
        }
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <GroupHeader title={section.title} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={<RefreshStatusRow refresh={refresh} />}
        ListEmptyComponent={searching ? <NoResults query={query} /> : <View />}
        ListFooterComponent={
          searching ? (
            <View />
          ) : (
            <View>
              {status !== 'ready' && (
                <CatalogStatusRow status={status} onRetry={() => void load({ force: true })} />
              )}
              <GroupFooter>{t('picker.footnote')}</GroupFooter>
            </View>
          )
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          contentColumn,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={24}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.screenMargin - spacing.xs },
});
