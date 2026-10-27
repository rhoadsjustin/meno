/**
 * Reader (docs/07 §6): pure typography — a chapter of Scripture in New York
 * with superscript verse numbers, chapter navigation, and attribution.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { ScreenHeader } from '@/components/screen-header';
import { BookSpread } from '@/features/reader/BookSpread';
import { useTranslation } from '@/i18n/react';
import {
  DEFAULT_TRANSLATION_ID,
  bookName,
  getBook,
  getChapter,
  getTranslation,
  parseOsisRef,
  type Verse,
} from '@/services/bible';
import { useThemeColors, fonts, layout, radius, spacing, scriptureType } from '@/theme';

export default function ReaderRoute() {
  const { osis, translation } = useLocalSearchParams<{ osis: string; translation?: string }>();
  const colors = useThemeColors();
  const { t } = useTranslation('reader');
  // Wide windows (iPhone Duo opened): a chapter sidebar beside the text.
  const { sides, isWide, foldAxis } = useContentLayout();
  // Book pose: the Duo half-open with the crease running top to bottom.
  // The chapter is paged, one page each side of the crease, and turns like
  // a book instead of scrolling; the sidebar steps aside.
  const book = isWide && foldAxis === 'vertical';

  const translationId = translation ?? DEFAULT_TRANSLATION_ID;
  const [verses, setVerses] = useState<Verse[]>([]);
  // The chapter that failed to load, if any; the message is worded at render.
  const [failed, setFailed] = useState<string | null>(null);

  let ref;
  try {
    ref = parseOsisRef(osis);
  } catch {
    ref = { bookId: 'John', chapter: 1, verse: 1 };
  }
  const bookInfo = getBook(ref.bookId);
  const title = t('title', { book: bookName(ref.bookId), chapter: ref.chapter });
  const error = failed === title ? t('loadFailed', { chapter: title }) : null;

  useEffect(() => {
    let cancelled = false;
    const chapterTitle = t('title', { book: bookName(ref.bookId), chapter: ref.chapter });
    (async () => {
      const rows = await getChapter(translationId, ref.bookId, ref.chapter);
      if (!cancelled) setVerses(rows);
    })().catch(() => {
      if (!cancelled) setFailed(chapterTitle);
    });
    return () => {
      cancelled = true;
    };
  }, [translationId, ref.bookId, ref.chapter, t]);

  const goToChapter = (chapter: number) => {
    router.setParams({ osis: `${ref.bookId}.${chapter}.1` });
  };
  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {/* Native bar: back chevron, chapter title, previous/next as symbols —
          on iPhone Duo the system moves them to the side with the status bar. */}
      {/* In the book pose a swipe turns the page, so the swipe-back gesture
          is off there; the back chevron in the bar still leaves the reader.
          The bar is clear and the pages run beneath it, so a turning sheet
          is not cut off where the bar begins. */}
      <Stack.Screen options={{ gestureEnabled: !book, headerTransparent: book }} />
      <ScreenHeader title={title} transparent={book}>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="chevron.left"
            accessibilityLabel={t('previousChapter')}
            disabled={ref.chapter <= 1}
            onPress={() => goToChapter(ref.chapter - 1)}>
            {t('previousChapter')}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            icon="chevron.right"
            accessibilityLabel={t('nextChapter')}
            disabled={ref.chapter >= bookInfo.chapters}
            onPress={() => goToChapter(ref.chapter + 1)}>
            {t('nextChapter')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      {book ? (
        <>
          {error && (
            <Text
              style={[
                styles.attribution,
                styles.bookError,
                { color: colors.error, fontFamily: fonts?.ui },
              ]}>
              {error}
            </Text>
          )}
          <BookSpread
            translationId={translationId}
            bookId={ref.bookId}
            chapter={ref.chapter}
            chapterCount={bookInfo.chapters}
            onChapterChange={goToChapter}
          />
        </>
      ) : (
        <View style={isWide ? styles.split : styles.flex}>
          {isWide && (
            <ScrollView
              style={[styles.sidebar, { borderColor: colors.separator }]}
              contentContainerStyle={styles.sidebarContent}>
              <Text
                style={[styles.sidebarTitle, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {bookName(ref.bookId)}
              </Text>
              {chapters.map((n) => {
                const selected = n === ref.chapter;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => goToChapter(n)}
                    style={[styles.chapterRow, selected && { backgroundColor: colors.lapisWash }]}>
                    <Text
                      style={[
                        styles.chapterText,
                        {
                          color: selected ? colors.lapis : colors.ink,
                          fontFamily: fonts?.ui,
                          fontWeight: selected ? '600' : '400',
                        },
                      ]}>
                      {t('chapter', { chapter: n })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentColumn]}>
            {error && (
              <Text style={[styles.attribution, { color: colors.error, fontFamily: fonts?.ui }]}>
                {error}
              </Text>
            )}
            <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {renderVerses(verses, colors.inkFaint)}
            </Text>
            {verses.length > 0 && (
              <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                {getTranslation(translationId).attribution}
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function renderVerses(list: Verse[], numberColor: string) {
  return list.map((v) => (
    <Text key={`${v.chapter}:${v.verse}`}>
      <Text style={[styles.verseNum, { color: numberColor }]}>{v.verse} </Text>
      {v.text}{' '}
    </Text>
  ));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  split: { flex: 1, flexDirection: 'row' },
  // Proportional, not fixed: about a quarter of the window, capped for iPad.
  sidebar: { width: '26%', maxWidth: 240, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth },
  sidebarContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 2 },
  sidebarTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chapterRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  chapterText: { fontSize: 15 },
  content: {
    padding: layout.screenMargin,
    paddingBottom: spacing.xxxl * 2,
  },
  passage: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  verseNum: { fontSize: 13 },
  attribution: { fontSize: 13, marginTop: spacing.xxl },
  bookError: { marginTop: 0, paddingHorizontal: layout.screenMargin },
});
