/**
 * Reader (docs/07 §6): pure typography — a chapter of Scripture in New York
 * with superscript verse numbers, chapter navigation, and attribution.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contentColumn, contentColumnWide, useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { ScreenHeader } from '@/components/screen-header';
import {
  DEFAULT_TRANSLATION_ID,
  getBook,
  getChapterVerseCount,
  getPassage,
  getTranslation,
  parseOsisRef,
  type Verse,
} from '@/services/bible';
import { useThemeColors, fonts, layout, radius, spacing, scriptureType } from '@/theme';

export default function ReaderRoute() {
  const { osis, translation } = useLocalSearchParams<{ osis: string; translation?: string }>();
  const colors = useThemeColors();
  // Wide windows (iPhone Duo opened): a chapter sidebar beside the text.
  const { sides, isWide, foldAxis } = useContentLayout();
  // Book pose: the Duo half-open with the crease running top to bottom.
  // The chapter reads as two facing pages and the sidebar steps aside.
  const book = isWide && foldAxis === 'vertical';

  const translationId = translation ?? DEFAULT_TRANSLATION_ID;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [error, setError] = useState<string | null>(null);

  let ref;
  try {
    ref = parseOsisRef(osis);
  } catch {
    ref = { bookId: 'John', chapter: 1, verse: 1 };
  }
  const bookInfo = getBook(ref.bookId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = await getChapterVerseCount(translationId, ref.bookId, ref.chapter);
      const rows = await getPassage(translationId, {
        start: { bookId: ref.bookId, chapter: ref.chapter, verse: 1 },
        end: { bookId: ref.bookId, chapter: ref.chapter, verse: count },
      });
      if (!cancelled) setVerses(rows);
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [translationId, ref.bookId, ref.chapter]);

  const goToChapter = (chapter: number) => {
    router.setParams({ osis: `${ref.bookId}.${chapter}.1` });
  };
  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);
  const [leftPage, rightPage] = useMemo(() => splitPages(verses), [verses]);

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {/* Native bar: back chevron, chapter title, previous/next as symbols —
          on iPhone Duo the system moves them to the side with the status bar. */}
      <ScreenHeader title={`${bookInfo.name} ${ref.chapter}`}>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="chevron.left"
            accessibilityLabel="Previous chapter"
            disabled={ref.chapter <= 1}
            onPress={() => goToChapter(ref.chapter - 1)}>
            Previous chapter
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            icon="chevron.right"
            accessibilityLabel="Next chapter"
            disabled={ref.chapter >= bookInfo.chapters}
            onPress={() => goToChapter(ref.chapter + 1)}>
            Next chapter
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      <View style={isWide ? styles.split : styles.flex}>
        {isWide && !book && (
          <ScrollView
            style={[styles.sidebar, { borderColor: colors.separator }]}
            contentContainerStyle={styles.sidebarContent}>
            <Text style={[styles.sidebarTitle, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {bookInfo.name}
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
                    Chapter {n}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, book ? contentColumnWide : contentColumn]}>
          {error && (
            <Text style={[styles.attribution, { color: colors.error, fontFamily: fonts?.ui }]}>
              {error}
            </Text>
          )}
          {book ? (
            <FoldAwareRow>
              <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                {renderVerses(leftPage, colors.inkFaint)}
              </Text>
              <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                {renderVerses(rightPage, colors.inkFaint)}
              </Text>
            </FoldAwareRow>
          ) : (
            <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
              {renderVerses(verses, colors.inkFaint)}
            </Text>
          )}
          {verses.length > 0 && (
            <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {getTranslation(translationId).attribution}
            </Text>
          )}
        </ScrollView>
      </View>
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

/** Two facing pages of roughly equal length, split on a verse boundary. */
function splitPages(list: Verse[]): [Verse[], Verse[]] {
  const total = list.reduce((n, v) => n + v.text.length, 0);
  let acc = 0;
  let cut = list.length;
  for (let i = 0; i < list.length; i++) {
    acc += list[i].text.length;
    if (acc >= total / 2) {
      cut = i + 1;
      break;
    }
  }
  return [list.slice(0, cut), list.slice(cut)];
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
});
