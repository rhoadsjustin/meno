/**
 * Reader (docs/07 §6): pure typography — a chapter of Scripture in New York
 * with superscript verse numbers, chapter navigation, and attribution.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEFAULT_TRANSLATION_ID,
  getBook,
  getChapterVerseCount,
  getPassage,
  getTranslation,
  parseOsisRef,
  type Verse,
} from '@/services/bible';
import { useThemeColors, fonts, layout, spacing, scriptureType } from '@/theme';

export default function ReaderRoute() {
  const { osis, translation } = useLocalSearchParams<{ osis: string; translation?: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const translationId = translation ?? DEFAULT_TRANSLATION_ID;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [error, setError] = useState<string | null>(null);

  let ref;
  try {
    ref = parseOsisRef(osis);
  } catch {
    ref = { bookId: 'John', chapter: 1, verse: 1 };
  }
  const book = getBook(ref.bookId);

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

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.chromeButton, { color: colors.lapis, fontFamily: fonts?.ui }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.chromeTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {book.name} {ref.chapter}
        </Text>
        <View style={styles.chromeNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous chapter"
            disabled={ref.chapter <= 1}
            onPress={() => goToChapter(ref.chapter - 1)}
            hitSlop={8}>
            <Text style={[styles.chromeButton, { color: ref.chapter <= 1 ? colors.separator : colors.lapis }]}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next chapter"
            disabled={ref.chapter >= book.chapters}
            onPress={() => goToChapter(ref.chapter + 1)}
            hitSlop={8}>
            <Text
              style={[styles.chromeButton, { color: ref.chapter >= book.chapters ? colors.separator : colors.lapis }]}>
              ›
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <Text style={[styles.attribution, { color: colors.error, fontFamily: fonts?.ui }]}>{error}</Text>
        )}
        <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {verses.map((v) => (
            <Text key={`${v.chapter}:${v.verse}`}>
              <Text style={[styles.verseNum, { color: colors.inkFaint }]}>{v.verse} </Text>
              {v.text}{' '}
            </Text>
          ))}
        </Text>
        {verses.length > 0 && (
          <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {getTranslation(translationId).attribution}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.sm,
  },
  chromeButton: { fontSize: 17 },
  chromeTitle: { fontSize: 17, fontWeight: '600' },
  chromeNav: { flexDirection: 'row', gap: spacing.xl },
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
