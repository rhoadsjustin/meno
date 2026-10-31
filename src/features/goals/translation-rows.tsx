/**
 * Rows for the translation picker, drawn as an inset grouped list (HIG
 * Lists and tables): a translation row ends in a check mark when it is the
 * current choice; a language row says how many translations it has and, on
 * iOS, ends in a disclosure chevron because it opens another screen.
 * Material lists carry no chevron, so Android leaves it off.
 */
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { t as translate } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { translationCoverage, type LanguageSummary, type Translation } from '@/services/bible';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

/** Plain words for where a translation's text lives. */
export function availabilityLabel(tr: Translation): string {
  switch (tr.source) {
    case 'bundled':
      return translate('goals:picker.onDevice');
    case 'esv_api':
      return translate('goals:picker.savedForGoals');
    default:
      return translate('goals:picker.needsConnection');
  }
}

/** "New Testament", "4 books", or nothing for a whole Bible. */
export function coverageLabel(tr: Translation): string | null {
  const c = translationCoverage(tr);
  switch (c.kind) {
    case 'full':
      return null;
    case 'nt':
      return translate('goals:picker.newTestament');
    case 'ot':
      return translate('goals:picker.oldTestament');
    case 'books':
      return translate('goals:picker.bookCount', { count: c.count });
  }
}

/** Where a row sits in its group, for the group's rounded ends and separators. */
export type GroupPosition = { first: boolean; last: boolean };

function GroupRow({
  position,
  children,
  ...press
}: {
  position: GroupPosition;
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: { selected?: boolean; busy?: boolean };
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      {...press}
      style={({ pressed }) => [
        styles.groupRow,
        { backgroundColor: pressed ? colors.lapisWash : colors.surfaceRaised },
        position.first && styles.groupFirst,
        position.last && styles.groupLast,
      ]}>
      <View
        style={[
          styles.rowInner,
          !position.last && {
            borderBottomColor: colors.separator,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}>
        {children}
      </View>
    </Pressable>
  );
}

export function TranslationRow({
  translation: tr,
  selected,
  languageTitle,
  position,
  onPress,
}: {
  translation: Translation;
  selected: boolean;
  /** Shown first in the detail line in search results, where languages mix. */
  languageTitle?: string;
  position: GroupPosition;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const detail = [languageTitle, tr.abbrev, coverageLabel(tr), availabilityLabel(tr)]
    .filter(Boolean)
    .join(' · ');
  return (
    <GroupRow
      position={position}
      onPress={onPress}
      accessibilityLabel={`${tr.name}. ${detail}`}
      accessibilityState={{ selected }}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {tr.name}
        </Text>
        <Text style={[styles.rowDetail, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {detail}
        </Text>
      </View>
      {selected && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={colors.lapis}
          size={18}
          weight="semibold"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </GroupRow>
  );
}

export function LanguageRow({
  language,
  position,
  onPress,
}: {
  language: LanguageSummary;
  position: GroupPosition;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  const count = t('picker.translationCount', { count: language.count });
  return (
    <GroupRow
      position={position}
      onPress={onPress}
      accessibilityLabel={`${language.title}, ${count}`}
      accessibilityHint={t('picker.languageHint')}>
      <Text style={[styles.rowTitle, styles.rowText, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {language.title}
      </Text>
      <Text style={[styles.rowValue, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {Platform.OS === 'ios' ? String(language.count) : count}
      </Text>
      {Platform.OS === 'ios' && (
        <SymbolView
          name="chevron.right"
          tintColor={colors.inkFaint}
          size={13}
          weight="semibold"
          accessibilityElementsHidden
        />
      )}
    </GroupRow>
  );
}

export function GroupHeader({ title }: { title: string }) {
  const colors = useThemeColors();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.groupHeader, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
      {Platform.OS === 'ios' ? title.toLocaleUpperCase() : title}
    </Text>
  );
}

/** A note under the list, in the grouped list's footer style. */
export function GroupFooter({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <Text style={[styles.groupFooter, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
      {children}
    </Text>
  );
}

/** Loading or failed, under the featured languages; a retry when failed. */
export function CatalogStatusRow({
  status,
  onRetry,
}: {
  status: 'loading' | 'error';
  onRetry: () => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation(['goals', 'common']);
  if (status === 'loading') {
    return (
      <View style={styles.status} accessible accessibilityLabel={t('picker.loading')}>
        <ActivityIndicator color={colors.inkFaint} />
        <Text style={[styles.statusText, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('picker.loading')}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.status}>
      <Text
        accessibilityRole="alert"
        style={[styles.statusText, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('picker.catalogFailed')}
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
        <Text style={[styles.statusText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
          {t('common:retry')}
        </Text>
      </Pressable>
    </View>
  );
}

/** The empty search state (HIG: say what was searched and what to try). */
export function NoResults({ query }: { query: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  return (
    <View style={styles.noResults} accessible accessibilityRole="text">
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        tintColor={colors.inkFaint}
        size={40}
      />
      <Text style={[styles.noResultsTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {t('picker.noResults', { query: query.trim() })}
      </Text>
      <Text style={[styles.noResultsHint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('picker.noResultsHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupRow: { paddingLeft: spacing.lg, borderCurve: 'continuous' },
  groupFirst: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  groupLast: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17 },
  rowDetail: { fontSize: 13, lineHeight: 18 },
  rowValue: { fontSize: 17 },
  groupHeader: {
    fontSize: 13,
    fontWeight: Platform.OS === 'ios' ? '400' : '600',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  groupFooter: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  statusText: { fontSize: 15, lineHeight: 20 },
  noResults: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  noResultsTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  noResultsHint: { fontSize: 15, lineHeight: 20, textAlign: 'center' },
});
