/**
 * Goal wizard, step 1 (docs/07 §6): translation, book and chapter as native
 * menus, then the chapter itself as a list — tap the first verse, then the
 * last. The selection is echoed in a bar pinned above the sheet's buttons.
 */
import { Host, Picker } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type ListRenderItem,
} from 'react-native';

import { contentColumn } from '@/components/content-layout';
import { ExtendMenu } from '@/features/goals/ExtendMenu';
import {
  BOOKS,
  DEFAULT_TRANSLATION_ID,
  availableTranslations,
  formatRange,
  getBook,
  getChapter,
  getTranslation,
  type Verse,
} from '@/services/bible';
import {
  chaptersToExtendThrough,
  clampToChapter,
  extendThroughChapter,
  isVerseSelected,
  selectWholeChapter,
  selectionToRange,
  setEnd,
  setStart,
  tapVerse,
  type PassageSelection,
} from '@/services/bible/selection';
import { useThemeColors, fonts, spacing } from '@/theme';

/** The pinned bar is chrome: it grows with Dynamic Type, but not so far that
 * it crowds the verses out of a short sheet. */
const BAR_MAX_SCALE = 1.6;

const VERSE_ACTIONS = [
  { name: 'start', label: 'Start passage here' },
  { name: 'end', label: 'End passage here' },
];

type Loaded =
  | { key: string; verses: Verse[] }
  | { key: string; verses: null };

type Props = {
  /** The step's title block, scrolled with the controls. */
  heading: ReactNode;
  /** Null for the instant the remembered translation is being read. */
  translationId: string | null;
  onTranslationChange: (id: string) => void;
  bookId: string;
  onBookChange: (id: string) => void;
  chapter: number;
  onChapterChange: (chapter: number) => void;
  selection: PassageSelection | null;
  setSelection: Dispatch<SetStateAction<PassageSelection | null>>;
  /** A failure from the wizard's Continue, shown in the pinned bar. */
  error: string | null;
};

/** Plain words for a passage that would not load; bundled text never needs the network. */
export function loadFailureMessage(translationId: string, what: string): string {
  const t = getTranslation(translationId);
  return t.source === 'bundled'
    ? `Couldn’t load ${what}.`
    : `Couldn’t load ${what} in the ${t.abbrev}. It needs a connection the first time.`;
}

export function PassageStep({
  heading,
  translationId,
  onTranslationChange,
  bookId,
  onBookChange,
  chapter,
  onChapterChange,
  selection,
  setSelection,
  error,
}: Props) {
  const colors = useThemeColors();
  const book = getBook(bookId);
  const listRef = useRef<FlatList<Verse>>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [extendError, setExtendError] = useState<string | null>(null);

  // A result for another chapter (or an earlier try) reads as still loading.
  const loadKey = `${translationId}.${bookId}.${chapter}.${attempt}`;
  const current = loaded?.key === loadKey ? loaded : null;
  const verses = current?.verses ?? null;
  const failed = current !== null && current.verses === null;
  const lastVerse = verses ? verses[verses.length - 1].verse : null;

  useEffect(() => {
    if (!translationId) return;
    let cancelled = false;
    getChapter(translationId, bookId, chapter)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          setLoaded({ key: loadKey, verses: null });
          return;
        }
        setLoaded({ key: loadKey, verses: rows });
        // Translations disagree on a few chapter lengths; keep the ends real.
        const last = rows[rows.length - 1].verse;
        setSelection((s) => (s && s.bookId === bookId ? clampToChapter(s, chapter, last) : s));
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: loadKey, verses: null });
      });
    return () => {
      cancelled = true;
    };
  }, [translationId, bookId, chapter, loadKey, setSelection]);

  // A new chapter starts at its first verse.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [bookId, chapter]);

  const commit = useCallback(
    (next: PassageSelection | null) => {
      setExtendError(null);
      setSelection(next);
      void Haptics.selectionAsync();
      AccessibilityInfo.announceForAccessibility(
        next ? `${formatRange(selectionToRange(next))} selected` : 'Selection cleared'
      );
    },
    [setSelection]
  );

  const onVersePress = useCallback(
    (verse: number) => commit(tapVerse(selection, bookId, { chapter, verse })),
    [commit, selection, bookId, chapter]
  );

  const onVerseAction = useCallback(
    (verse: number, action: string) => {
      const point = { chapter, verse };
      if (action === 'start') commit(setStart(selection, bookId, point));
      else if (action === 'end') commit(setEnd(selection, bookId, point));
    },
    [commit, selection, bookId, chapter]
  );

  const extend = async (through: number) => {
    if (!translationId) return;
    try {
      const rows = await getChapter(translationId, bookId, through);
      if (rows.length === 0) throw new Error('empty chapter');
      commit(extendThroughChapter(selection, bookId, chapter, through, rows[rows.length - 1].verse));
    } catch {
      setExtendError(loadFailureMessage(translationId, `${book.name} ${through}`));
    }
  };

  const verseHint = selection?.open
    ? 'Ends the passage here.'
    : 'Starts the passage here. Then choose the last verse.';

  const renderVerse: ListRenderItem<Verse> = ({ item }) => (
    <VerseRow
      verse={item.verse}
      text={item.text}
      selected={isVerseSelected(selection, bookId, { chapter, verse: item.verse })}
      hint={verseHint}
      onPress={onVersePress}
      onAction={onVerseAction}
    />
  );

  const extendable = chaptersToExtendThrough(selection, bookId, chapter, book.chapters);

  const header = (
    <View style={styles.header}>
      {heading}
      <View style={styles.controlRow}>
        <Text style={[styles.controlLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Translation
        </Text>
        {translationId && (
          <Host matchContents seedColor={colors.lapis}>
            <Picker selectedValue={translationId} onValueChange={(v) => onTranslationChange(String(v))}>
              {availableTranslations().map((t) => (
                <Picker.Item key={t.id} label={t.name} value={t.id} />
              ))}
            </Picker>
          </Host>
        )}
      </View>
      <View style={styles.controlRow}>
        <Host matchContents seedColor={colors.lapis}>
          <Picker selectedValue={bookId} onValueChange={(v) => onBookChange(String(v))}>
            {BOOKS.map((b) => (
              <Picker.Item key={b.id} label={b.name} value={b.id} />
            ))}
          </Picker>
        </Host>
        {book.chapters > 1 && (
          <Host matchContents seedColor={colors.lapis}>
            <Picker selectedValue={chapter} onValueChange={(v) => onChapterChange(Number(v))}>
              {Array.from({ length: book.chapters }, (_, i) => (
                <Picker.Item key={i + 1} label={`Chapter ${i + 1}`} value={i + 1} />
              ))}
            </Picker>
          </Host>
        )}
      </View>
      <View style={styles.controlRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select all of ${book.name} ${chapter}`}
          accessibilityState={{ disabled: lastVerse === null }}
          disabled={lastVerse === null}
          onPress={() => {
            if (lastVerse !== null) commit(selectWholeChapter(bookId, chapter, lastVerse));
          }}
          style={[styles.textButton, { opacity: lastVerse === null ? 0.4 : 1 }]}>
          <Text style={[styles.textButtonLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            Whole chapter
          </Text>
        </Pressable>
        {extendable.length > 0 && (
          <ExtendMenu chapters={extendable} onExtend={(c) => void extend(c)} tint={colors.lapis} />
        )}
      </View>
      {extendError && (
        <Text
          accessibilityRole="alert"
          style={[styles.notice, { color: colors.error, fontFamily: fonts?.ui }]}>
          {extendError}
        </Text>
      )}
    </View>
  );

  const empty = failed ? (
    <View style={styles.empty}>
      <Text
        accessibilityRole="alert"
        style={[styles.emptyText, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {translationId && loadFailureMessage(translationId, `${book.name} ${chapter}`)}
      </Text>
      <View style={styles.controlRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAttempt((n) => n + 1)}
          style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            Try again
          </Text>
        </Pressable>
        {translationId !== DEFAULT_TRANSLATION_ID && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onTranslationChange(DEFAULT_TRANSLATION_ID)}
            style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
              Use the {getTranslation(DEFAULT_TRANSLATION_ID).abbrev} instead
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  ) : (
    <View style={styles.empty} accessible accessibilityLabel={`Loading ${book.name} ${chapter}`}>
      <ActivityIndicator color={colors.inkFaint} />
    </View>
  );

  return (
    <>
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, contentColumn]}
        data={verses ?? []}
        extraData={selection}
        keyExtractor={(v) => String(v.verse)}
        renderItem={renderVerse}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          verses && translationId ? (
            <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {getTranslation(translationId).attribution}
            </Text>
          ) : null
        }
        initialNumToRender={12}
        windowSize={7}
      />

      <View style={[styles.bar, { borderTopColor: colors.separator }]}>
        <View style={[styles.barInner, contentColumn]}>
          <View style={styles.barText}>
            <Text
              maxFontSizeMultiplier={BAR_MAX_SCALE}
              style={[styles.barRef, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {selection ? formatRange(selectionToRange(selection)) : 'No verses selected'}
            </Text>
            <Text
              maxFontSizeMultiplier={BAR_MAX_SCALE}
              style={[
                styles.barHint,
                { color: error ? colors.error : colors.inkFaint, fontFamily: fonts?.ui },
              ]}>
              {error ??
                (!selection
                  ? 'Tap a verse to begin.'
                  : selection.open
                    ? 'Tap another verse to end the range, or continue with this one.'
                    : 'Tap a verse to choose again.')}
            </Text>
          </View>
          {selection && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear selection"
              onPress={() => commit(null)}
              style={styles.textButton}>
              <Text
                maxFontSizeMultiplier={BAR_MAX_SCALE}
                style={[styles.textButtonLabel, { color: colors.lapis, fontFamily: fonts?.ui }]}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

type VerseRowProps = {
  verse: number;
  text: string;
  selected: boolean;
  hint: string;
  onPress: (verse: number) => void;
  onAction: (verse: number, action: string) => void;
};

/** One verse. Selection is shown by the wash and by the bar on the leading
 * edge and the heavier number, so it never rests on color alone. */
const VerseRow = memo(function VerseRow({
  verse,
  text,
  selected,
  hint,
  onPress,
  onAction,
}: VerseRowProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Verse ${verse}. ${text}`}
      accessibilityState={{ selected }}
      accessibilityHint={hint}
      accessibilityActions={VERSE_ACTIONS}
      onAccessibilityAction={(e: AccessibilityActionEvent) => onAction(verse, e.nativeEvent.actionName)}
      onPress={() => onPress(verse)}
      style={[styles.verseRow, selected && { backgroundColor: colors.lapisWash }]}>
      <View style={[styles.verseMark, selected && { backgroundColor: colors.lapis }]} />
      <Text style={[styles.verseText, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        <Text
          style={[
            styles.verseNum,
            { color: selected ? colors.lapis : colors.inkFaint, fontFamily: fonts?.ui },
            selected && styles.verseNumSelected,
          ]}>
          {verse}{' '}
        </Text>
        {text}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xl },
  header: { padding: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  // Wraps rather than squeezes: at accessibility sizes each control takes its own line.
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  controlLabel: { fontSize: 15 },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textButtonLabel: { fontSize: 17 },
  notice: { fontSize: 15 },
  empty: { padding: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  emptyText: { fontSize: 17, lineHeight: 24 },
  verseRow: {
    flexDirection: 'row',
    minHeight: 44,
    paddingRight: spacing.xl,
  },
  verseMark: { width: 3, marginRight: spacing.xl - 3 },
  verseText: { flex: 1, fontSize: 19, lineHeight: 28, paddingVertical: spacing.sm },
  verseNum: { fontSize: 13 },
  verseNumSelected: { fontWeight: '700' },
  attribution: { fontSize: 13, lineHeight: 18, padding: spacing.xl },
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  barText: { flex: 1, gap: 2 },
  barRef: { fontSize: 17, fontWeight: '600' },
  barHint: { fontSize: 13, lineHeight: 18 },
});
