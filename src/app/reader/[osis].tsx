/**
 * Reader (docs/07 §6): pure typography — a chapter of Scripture in New York
 * with superscript verse numbers, chapter navigation, and attribution.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { useBarIcon } from '@/components/bar-icon';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { useScreenReader } from '@/components/screen-reader';
import { TextLink } from '@/components/text-link';
import { LoadingState, Unavailable } from '@/components/unavailable';
import { BookSpread } from '@/features/reader/BookSpread';
import { neighbourChapter } from '@/features/reader/chapters';
import { verseMark } from '@/features/reader/paginate';
import { useReaderPrefs } from '@/features/reader/reader-prefs';
import { readerType } from '@/features/reader/text-size';
import { showVerseActions } from '@/features/reader/verse-actions';
import { useTranslation } from '@/i18n/react';
import {
  DEFAULT_TRANSLATION_ID,
  bookName,
  formatRef,
  getChapter,
  getTranslation,
  loadFailureMessage,
  parseOsisRef,
  type Ref,
  type Verse,
} from '@/services/bible';
import { readingPlace, rememberReadingPlace } from '@/services/db/repos/readerPrefs';
import { useAvailableChapters } from '@/features/reader/use-available-chapters';
import { useThemeColors, fonts, layout, radius, spacing, scriptureType } from '@/theme';

/** The one custom action a verse offers VoiceOver, beside reading it. */
const MEMORIZE_ACTION = 'memorize';

export default function ReaderRoute() {
  const { osis, translation } = useLocalSearchParams<{ osis: string; translation?: string }>();

  let ref: Ref | null;
  try {
    ref = parseOsisRef(osis);
  } catch {
    // A link that names no chapter says so, rather than opening some other
    // chapter as if it had been asked for.
    ref = null;
  }
  if (!ref) return <BadLink />;
  return (
    <Reader
      bookId={ref.bookId}
      chapter={ref.chapter}
      translationId={knownTranslationId(translation)}
    />
  );
}

/** The link's translation, or the default when it names one this device does not know. */
function knownTranslationId(id: string | undefined): string {
  if (!id) return DEFAULT_TRANSLATION_ID;
  try {
    return getTranslation(id).id;
  } catch {
    return DEFAULT_TRANSLATION_ID;
  }
}

function BadLink() {
  const colors = useThemeColors();
  const { t } = useTranslation('reader');
  const { sides } = useContentLayout();
  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={t('screenTitle')} />
      <Unavailable
        kind="failed"
        layout="fill"
        title={t('badLinkTitle')}
        message={t('badLinkMessage')}
        action={{ label: t('goToToday'), onPress: () => router.dismissTo('/') }}
      />
    </View>
  );
}

function Reader({
  bookId,
  chapter,
  translationId,
}: {
  bookId: string;
  chapter: number;
  translationId: string;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation(['reader', 'common']);
  const previousIcon = useBarIcon('chevron.left', 'chevron_left');
  const nextIcon = useBarIcon('chevron.right', 'chevron_right');
  const chaptersIcon = useBarIcon('list.number', 'format_list_numbered');
  // Windows wider than tall (iPhone Duo opened): a chapter sidebar beside
  // the text. Taller than wide (opened and rotated) the text keeps the full
  // width; the bar's chapter menu is there in every layout.
  const { sides, isWide, twoPane, foldAxis } = useContentLayout();
  // Book pose: the Duo half-open with the crease running top to bottom.
  // The chapter is paged, one page each side of the crease, and turns like
  // a book instead of scrolling; the sidebar steps aside.
  const book = isWide && foldAxis === 'vertical';
  const screenReader = useScreenReader();

  // Text size (docs/07 §4): 22/34 unless the reader chose another, 18–28.
  const textSize = useReaderPrefs((s) => s.textSize);
  const hydrateTextSize = useReaderPrefs((s) => s.hydrate);
  const stepTextSize = useReaderPrefs((s) => s.step);
  const resetTextSize = useReaderPrefs((s) => s.reset);
  useEffect(hydrateTextSize, [hydrateTextSize]);
  const type = useMemo(() => readerType(textSize, scriptureType), [textSize]);

  // What the last finished load produced, tagged with the chapter it was
  // for: `verses: null` is a failure. Anything tagged for another chapter
  // counts as still loading, so a slow chapter never shows the previous
  // one's text (or its error) under the new title.
  const [loaded, setLoaded] = useState<{ key: string; verses: Verse[] | null } | null>(null);
  // Bumped by Try again to fetch the same chapter once more.
  const [attempt, setAttempt] = useState(0);

  const chapterTitle = (n: number) => t('title', { book: bookName(bookId), chapter: n });
  const title = chapterTitle(chapter);
  const chapterKey = `${translationId}:${bookId}:${chapter}`;
  const current = loaded?.key === chapterKey ? loaded : null;
  const verses = current?.verses ?? [];
  const failed = current !== null && current.verses === null;

  useEffect(() => {
    let cancelled = false;
    getChapter(translationId, bookId, chapter)
      .then((rows) => {
        if (!cancelled) setLoaded({ key: chapterKey, verses: rows });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: chapterKey, verses: null });
      });
    return () => {
      cancelled = true;
    };
  }, [translationId, bookId, chapter, chapterKey, attempt]);

  // A new chapter opens at its top: the route only changes its params, so
  // the same scroll view stays mounted and would keep the last offset.
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [chapterKey]);

  // Where reading stopped: the chapter last moved to in this book. A link
  // opens the chapter it names; when reading had gone on to another one,
  // that chapter is offered above the text until the reader moves.
  const [resume, setResume] = useState<number | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    let live = true;
    moved.current = false;
    readingPlace(bookId)
      .then((place) => {
        if (live && !moved.current) setResume(place);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [bookId]);

  // In place of the passage: what failed (and whether it needs a
  // connection), with a way to try again.
  const failure = failed && (
    <Unavailable
      kind="failed"
      layout={book ? 'fill' : 'inline'}
      title={t('loadFailedTitle')}
      message={loadFailureMessage(translationId, title)}
      action={{
        label: t('common:retry'),
        onPress: () => {
          setLoaded(null);
          setAttempt((n) => n + 1);
        },
      }}
    />
  );

  const goToChapter = (to: number) => {
    moved.current = true;
    setResume(null);
    rememberReadingPlace(bookId, to).catch(() => {});
    router.setParams({ osis: `${bookId}.${to}.1` });
  };
  // Only the chapters this translation has (a portion may skip some).
  const { chapters } = useAvailableChapters(translationId, bookId);
  const previousChapter = neighbourChapter(chapters, chapter, -1);
  const nextChapter = neighbourChapter(chapters, chapter, 1);
  const resumeAt =
    resume !== null && resume !== chapter && chapters.includes(resume) ? resume : null;

  // "Memorize this…" (docs/07 §6): the goal wizard, started at the verse.
  const memorize = (v: Verse) =>
    router.push({
      pathname: '/goal-wizard',
      // The wizard opens in the translation being read, when it can use it.
      params: {
        bookId: v.bookId,
        chapter: String(v.chapter),
        verse: String(v.verse),
        translation: translationId,
      },
    });
  // The verse whose actions are up, tinted while they are.
  const [picked, setPicked] = useState<number | null>(null);
  const offerActions = (v: Verse) => {
    setPicked(v.verse);
    showVerseActions({
      title: formatRef(v),
      onMemorize: () => memorize(v),
      onClose: () => setPicked(null),
    });
  };

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
          {/* Text size, then every chapter of the book, in every layout: the
              sidebar below only exists on windows wider than tall, outside
              the book pose. */}
          <Stack.Toolbar.Menu
            icon={chaptersIcon}
            title={bookName(bookId)}
            accessibilityLabel={t('chapterMenu')}>
            <Stack.Toolbar.Menu inline title={t('textSize')}>
              {/* Stepping keeps the menu up, so several steps are one visit. */}
              <Stack.Toolbar.MenuAction
                unstable_keepPresented
                disabled={textSize <= scriptureType.minSize}
                onPress={() => stepTextSize(-1)}>
                {t('textSmaller')}
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                unstable_keepPresented
                disabled={textSize >= scriptureType.maxSize}
                onPress={() => stepTextSize(1)}>
                {t('textLarger')}
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                disabled={textSize === scriptureType.defaultSize}
                onPress={resetTextSize}>
                {t('textDefault')}
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            {chapters.length > 1 &&
              chapters.map((n) => (
                <Stack.Toolbar.MenuAction
                  key={n}
                  isOn={n === chapter}
                  onPress={() => goToChapter(n)}>
                  {t('chapter', { chapter: n })}
                </Stack.Toolbar.MenuAction>
              ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Button
            icon={previousIcon}
            accessibilityLabel={t('previousChapter')}
            disabled={previousChapter === undefined}
            onPress={() => previousChapter !== undefined && goToChapter(previousChapter)}>
            {t('previousChapter')}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            icon={nextIcon}
            accessibilityLabel={t('nextChapter')}
            disabled={nextChapter === undefined}
            onPress={() => nextChapter !== undefined && goToChapter(nextChapter)}>
            {t('nextChapter')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </ScreenHeader>

      {book ? (
        failure ? (
          // On the left page, clear of the crease, and centred in the page's
          // height so it sits below the clear navigation bar.
          <FoldAwareRow fill>
            {failure}
            <View />
          </FoldAwareRow>
        ) : (
          <BookSpread
            translationId={translationId}
            bookId={bookId}
            chapter={chapter}
            chapters={chapters}
            textSize={textSize}
            onChapterChange={goToChapter}
          />
        )
      ) : (
        <View style={twoPane ? styles.split : styles.flex}>
          {twoPane && (
            <ScrollView
              style={[styles.sidebar, { borderColor: colors.separator }]}
              contentContainerStyle={styles.sidebarContent}>
              <SectionHeader title={bookName(bookId)} style={styles.sidebarTitle} />
              {chapters.map((n) => {
                const selected = n === chapter;
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
          <ScrollView
            ref={scroll}
            style={styles.flex}
            contentContainerStyle={[styles.content, contentColumn]}>
            {resumeAt !== null && (
              <TextLink
                label={t('resume', { chapter: chapterTitle(resumeAt) })}
                disclosure
                onPress={() => goToChapter(resumeAt)}
                style={styles.resume}
              />
            )}
            {failure}
            {current === null && (
              <LoadingState layout="inline" label={t('loadingChapter', { chapter: title })} />
            )}
            {verses.length > 0 &&
              (screenReader ? (
                // One element per verse, "Verse 2. The same was…": VoiceOver
                // moves verse by verse and can find its place again, where
                // the flowed paragraph is a single element for the chapter.
                // "Memorize this…" is each verse's action in the rotor.
                verses.map((v) => (
                  <Text
                    key={`${v.chapter}:${v.verse}`}
                    accessibilityLabel={t('verse', { verse: v.verse, text: v.text })}
                    accessibilityActions={[{ name: MEMORIZE_ACTION, label: t('memorize') }]}
                    onAccessibilityAction={(e) => {
                      if (e.nativeEvent.actionName === MEMORIZE_ACTION) memorize(v);
                    }}
                    style={[type, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                    <Text style={{ color: colors.inkFaint }}>{verseMark(v.verse)}</Text>
                    {v.text}
                  </Text>
                ))
              ) : (
                <Text style={[type, { color: colors.ink, fontFamily: fonts?.scripture }]}>
                  {verses.map((v) => (
                    // A long-press on a verse offers "Memorize this…".
                    <Text
                      key={`${v.chapter}:${v.verse}`}
                      suppressHighlighting
                      onLongPress={() => offerActions(v)}
                      style={picked === v.verse && { backgroundColor: colors.lapisWash }}>
                      {/* Superscript digits in the text's own size (docs/07 §4). */}
                      <Text style={{ color: colors.inkFaint }}>{verseMark(v.verse)}</Text>
                      {v.text}{' '}
                    </Text>
                  ))}
                </Text>
              ))}
            {verses.length > 0 && nextChapter !== undefined && (
              // The chapter's end leads on to the next one. Named for where
              // it goes; the bar's button keeps the plain "Next chapter".
              <TextLink
                label={t('nextChapterNamed', { chapter: chapterTitle(nextChapter) })}
                disclosure
                onPress={() => goToChapter(nextChapter)}
                style={styles.next}
              />
            )}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  split: { flex: 1, flexDirection: 'row' },
  // Proportional, not fixed: about a quarter of the window, capped for iPad.
  sidebar: { width: '26%', maxWidth: 240, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth },
  sidebarContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 2 },
  sidebarTitle: {
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
  resume: { alignSelf: 'flex-start', marginBottom: spacing.md },
  next: { alignSelf: 'flex-start', marginTop: spacing.xl },
  attribution: { fontSize: 13, marginTop: spacing.xxl },
});
