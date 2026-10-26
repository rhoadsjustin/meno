/**
 * Translation picker (docs/02 §5, 07 §6): every translation grouped by
 * language — the device's language and English first, then any language
 * browsed from the full list. Versions on the YouVersion Platform are
 * fetched per language the first time that language is opened and their
 * metadata kept; verse text never is, so they need a connection to practice.
 *
 * A modal over the goal wizard's sheet; the choice travels back through
 * features/goals/translation-choice.
 */
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  type SectionListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { useTranslationChoice } from '@/features/goals/translation-choice';
import { t as translate } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import {
  availableTranslations,
  browsedLanguageIds,
  cachedLanguages,
  deviceLocale,
  ensureBibles,
  ensureLanguages,
  filterLanguages,
  filterSections,
  groupByLanguage,
  languagesById,
  preferredLanguageIds,
  youversionKeyConfigured,
  type LanguageInfo,
  type Translation,
} from '@/services/bible';
import { useThemeColors, fonts, layout, radius, spacing } from '@/theme';

type Row =
  { kind: 'translation'; translation: Translation } | { kind: 'language'; language: LanguageInfo };

type Section = { key: string; title: string; data: Row[] };

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Plain words for where a translation's text lives. */
function availabilityLabel(tr: Translation): string {
  switch (tr.source) {
    case 'bundled':
      return translate('goals:picker.onDevice');
    case 'esv_api':
      return translate('goals:picker.savedForGoals');
    default:
      return translate('goals:picker.needsConnection');
  }
}

export function TranslationPicker() {
  const colors = useThemeColors();
  const { t } = useTranslation(['goals', 'common']);
  // Insets are this modal's own (the route wraps it in ModalSafeArea). In a
  // sheet the top one is zero; shown full-screen it is the status bar's.
  // Side insets matter on iPhone Duo's cover panel, where the status bar is
  // a strip down one side.
  const { insets, sides } = useContentLayout();
  const { top } = useSafeAreaInsets();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const choose = useTranslationChoice((s) => s.choose);

  const [query, setQuery] = useState('');
  // Loading from the first render when there is a catalog to load.
  const [status, setStatus] = useState<CatalogStatus>(() =>
    youversionKeyConfigured() ? 'loading' : 'idle',
  );
  const [attempt, setAttempt] = useState(0);
  const [browsing, setBrowsing] = useState<string | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);
  // The registry and catalog cache are plain modules; bump to re-read them.
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const locale = useMemo(() => deviceLocale(), []);
  const preferred = useMemo(() => preferredLanguageIds(locale), [locale]);
  const platform = youversionKeyConfigured();

  // The language list, then the preferred languages' versions — from the
  // cache when fetched within the week, else from the Platform.
  useEffect(() => {
    if (!platform) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureLanguages(locale);
        for (const id of preferred) {
          try {
            await ensureBibles(id, { locale });
          } catch {
            // One language failing is not the catalog failing.
          }
          if (!cancelled) bump();
        }
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        if (!cancelled) bump();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, locale, preferred, bump, attempt]);

  const sections = useMemo<Section[]>(() => {
    void tick;
    const grouped = groupByLanguage(availableTranslations(), languagesById(), preferred);
    const out: Section[] = filterSections(grouped, query).map((s) => ({
      key: s.languageId,
      title: s.title,
      data: s.translations.map((translation) => ({ kind: 'translation' as const, translation })),
    }));
    if (platform) {
      // Languages already shown as a section stay out of the long list; one
      // browsed and found empty stays in it, with a note.
      const shown = new Set(grouped.map((s) => s.languageId));
      const more = filterLanguages(cachedLanguages(), shown, query);
      if (more.length > 0) {
        out.push({
          key: 'more',
          title: t('picker.moreLanguages'),
          data: more.map((language) => ({ kind: 'language' as const, language })),
        });
      }
    }
    return out;
  }, [tick, query, preferred, platform, t]);

  const pick = useCallback(
    (id: string) => {
      choose(id);
      closeModal();
    },
    [choose],
  );

  const browse = useCallback(
    async (language: LanguageInfo) => {
      setBrowsing(language.id);
      setBrowseError(null);
      try {
        const list = await ensureBibles(language.id, { locale, force: true });
        if (list.length === 0) {
          setBrowseError(t('picker.noVersionsFor', { language: language.name }));
        }
      } catch (e) {
        setBrowseError(
          e instanceof Error ? e.message : t('picker.loadFailed', { language: language.name }),
        );
      } finally {
        setBrowsing(null);
        bump();
      }
    },
    [locale, bump, t],
  );

  const renderItem: SectionListRenderItem<Row, Section> = ({ item }) => {
    if (item.kind === 'translation') {
      const tr = item.translation;
      const isSelected = tr.id === selected;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${tr.name}, ${tr.abbrev}. ${availabilityLabel(tr)}`}
          onPress={() => pick(tr.id)}
          style={[styles.row, { borderBottomColor: colors.separator }]}>
          <View style={styles.rowText}>
            <Text
              style={[
                styles.rowTitle,
                { color: isSelected ? colors.lapis : colors.ink, fontFamily: fonts?.ui },
              ]}>
              {tr.name}
            </Text>
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {tr.abbrev} · {availabilityLabel(tr)}
            </Text>
          </View>
          {isSelected && (
            <Text accessible={false} style={[styles.check, { color: colors.lapis }]}>
              ✓
            </Text>
          )}
        </Pressable>
      );
    }
    const l = item.language;
    const loading = browsing === l.id;
    const empty = browsedLanguageIds().has(l.id);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={l.name}
        accessibilityHint={t('picker.languageHint')}
        accessibilityState={{ busy: loading }}
        disabled={loading}
        onPress={() => void browse(l)}
        style={[styles.row, { borderBottomColor: colors.separator }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {l.name}
          </Text>
          {empty && !loading && (
            <Text style={[styles.rowSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {t('picker.noVersions')}
            </Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.inkFaint} />
        ) : (
          <Text accessible={false} style={[styles.chevron, { color: colors.inkFaint }]}>
            ›
          </Text>
        )}
      </Pressable>
    );
  };

  const header = (
    <View style={styles.header}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('passage.translation')}
      </Text>
      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          // A note about one language is stale once the search moves on.
          setBrowseError(null);
        }}
        placeholder={t('picker.search')}
        placeholderTextColor={colors.inkFaint}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={t('picker.search')}
        style={[
          styles.search,
          {
            color: colors.ink,
            borderColor: colors.separator,
            backgroundColor: colors.surfaceRaised,
            fontFamily: fonts?.ui,
          },
        ]}
      />
      {status === 'loading' && (
        <View style={styles.statusRow} accessible accessibilityLabel={t('picker.loading')}>
          <ActivityIndicator color={colors.inkFaint} />
          <Text style={[styles.status, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {t('picker.loading')}
          </Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.statusRow}>
          <Text
            accessibilityRole="alert"
            style={[styles.status, { color: colors.error, fontFamily: fonts?.ui }]}>
            {t('picker.catalogFailed')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStatus('loading');
              setAttempt((n) => n + 1);
            }}
            style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              {t('common:retry')}
            </Text>
          </Pressable>
        </View>
      )}
      {browseError && (
        <Text
          accessibilityRole="alert"
          style={[styles.status, { color: colors.error, fontFamily: fonts?.ui }]}>
          {browseError}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <View style={[styles.topBar, { paddingTop: top + spacing.lg }]}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={closeModal}>
          <Text style={[styles.cancel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {t('common:cancel')}
          </Text>
        </Pressable>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(row) =>
          row.kind === 'translation' ? row.translation.id : `language:${row.language.id}`
        }
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            style={[styles.sectionHeader, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text
            style={[
              styles.status,
              styles.empty,
              { color: colors.inkFaint, fontFamily: fonts?.ui },
            ]}>
            {query ? t('picker.noMatches', { query }) : t('picker.empty')}
          </Text>
        }
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenMargin,
  },
  cancel: { fontSize: 17 },
  content: { paddingHorizontal: layout.screenMargin },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700' },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  status: { fontSize: 15, lineHeight: 20 },
  empty: { paddingVertical: spacing.xl },
  textButton: { paddingVertical: spacing.sm },
  textButtonLabel: { fontSize: 17 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17 },
  rowSub: { fontSize: 13 },
  check: { fontSize: 20, fontWeight: '600' },
  chevron: { fontSize: 24, lineHeight: 26 },
});
