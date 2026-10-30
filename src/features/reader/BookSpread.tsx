/**
 * The Reader's book pose (iPhone Duo half-open, crease top to bottom): the
 * chapter is set as facing pages that each hold exactly what fits, one page
 * per side of the fold. Nothing scrolls — the page is turned by hand, with
 * the system page curl, and turning past a chapter's last page runs on into
 * the next chapter.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AccessibilityActionInfo,
  type TextLayoutEvent,
  type ViewInstance,
} from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHeaderHeight } from 'expo-router/react-navigation';

import { PageCurlView } from '@modules/page-curl';
import { useContentLayout } from '@/components/content-layout';
import { useTranslation } from '@/i18n/react';
import {
  buildFlow,
  pageRuns,
  paginate,
  spreadCount,
  spreadFor,
  type Flow,
  type Page,
  type Run,
} from '@/features/reader/paginate';
import { getChapter, getTranslation, type Verse } from '@/services/bible';
import { fonts, layout, scriptureType, spacing, useThemeColors, type ThemeColors } from '@/theme';

type Side = 'left' | 'right';
type Direction = 1 | -1; // 1 is forward, -1 back
type Paged = { flow: Flow; pages: Page[] };
type Target = { chapter: number; spread: number; anchor: number };
type Position = { chapter: number; anchor: number; from: number };
type Action = { type: 'sync'; chapter: number } | { type: 'jump'; to: Target };
type Face = { runs: Run[]; number: number } | null;
type Geometry = {
  width: number;
  spine: number; // x of the crease's centre, in the spread
  half: number; // width of one page's side; the same both sides of the crease
  inner: number; // page margin on the crease side
  textWidth: number;
  pageHeight: number;
  top: number;
  bottom: number;
  footer: number;
};

const NO_CHAPTERS: Record<number, never> = {};
// The footer is furniture: it grows with Dynamic Type, but only so far, so
// the largest sizes spend the page on Scripture and the attribution fits.
const FOOTER_MAX_SCALE = 1.4;
// The one custom action a page number offers: VoiceOver's double-tap turns the page.
const ACTIVATE: AccessibilityActionInfo[] = [{ name: 'activate' }];

function reduce(state: Position, action: Action): Position {
  switch (action.type) {
    case 'sync':
      return state.chapter === action.chapter
        ? { ...state, from: action.chapter }
        : { chapter: action.chapter, anchor: 0, from: action.chapter };
    case 'jump':
      return { ...state, chapter: action.to.chapter, anchor: action.to.anchor };
  }
}

export function BookSpread({
  translationId,
  bookId,
  chapter,
  chapterCount,
  onChapterChange,
}: {
  translationId: string;
  bookId: string;
  chapter: number;
  chapterCount: number;
  onChapterChange: (chapter: number) => void;
}) {
  const colors = useThemeColors();
  const { fold, insets } = useContentLayout();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // The pages run under the (clear) navigation bar; the text starts below it.
  const headerHeight = useHeaderHeight();

  // The reader's place. `from` remembers the chapter the route asked for, so
  // a jump made elsewhere (toolbar chevrons) resets to that chapter's first
  // page while a page turn that crossed chapters keeps its own position.
  const [pos, dispatch] = useReducer(reduce, { chapter, anchor: 0, from: chapter });
  if (pos.from !== chapter) dispatch({ type: 'sync', chapter });

  // Window frame of the spread, to map the fold (window points) onto it.
  const ref = useRef<ViewInstance>(null);
  const [frame, setFrame] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => setFrame({ x, y, width, height }));
  }, []);

  const geo = useMemo<Geometry | null>(() => {
    if (!frame || frame.width <= 0 || frame.height <= 0) return null;
    const crease =
      fold && fold.x > frame.x && fold.x + fold.width < frame.x + frame.width ? fold : null;
    const spine = crease ? crease.x + crease.width / 2 - frame.x : frame.width / 2;
    const inner = crease ? crease.width / 2 + spacing.md : spacing.lg;
    const top = Math.max(headerHeight - frame.y, 0) + spacing.md;
    const bottom = Math.max(insets.bottom, spacing.md);
    const footer = Math.ceil(22 * Math.min(fontScale, FOOTER_MAX_SCALE));
    // Both pages take the narrower side's width, so the spread is even
    // about the crease and a sheet reads the same on either side of it.
    const half = Math.min(spine, frame.width - spine);
    const textWidth = Math.floor(half - inner - layout.screenMargin);
    const pageHeight = Math.floor(frame.height - top - bottom - footer - spacing.sm);
    if (textWidth <= 0 || pageHeight <= 0) return null;
    return { width: frame.width, spine, half, inner, textWidth, pageHeight, top, bottom, footer };
  }, [frame, fold, insets.bottom, fontScale, headerHeight]);

  // Verses and pages for this chapter and its neighbours, so a turn across a
  // chapter boundary has its pages ready.
  const wanted = useMemo(
    () =>
      [pos.chapter - 1, pos.chapter, pos.chapter + 1].filter((c) => c >= 1 && c <= chapterCount),
    [pos.chapter, chapterCount],
  );
  const verses = useChapterVerses(translationId, bookId, wanted);
  const layoutKey = geo
    ? `${translationId}:${bookId}:${geo.textWidth}:${geo.pageHeight}:${fontScale}`
    : '';
  const [pagedCache, setPagedCache] = useState<{ key: string; chapters: Record<number, Paged> }>({
    key: layoutKey,
    chapters: NO_CHAPTERS,
  });
  const paged = pagedCache.key === layoutKey ? pagedCache.chapters : NO_CHAPTERS;
  const storePaged = useCallback(
    (c: number, result: Paged) =>
      setPagedCache((prev) => ({
        key: layoutKey,
        chapters: { ...(prev.key === layoutKey ? prev.chapters : NO_CHAPTERS), [c]: result },
      })),
    [layoutKey],
  );

  const current = paged[pos.chapter];
  const spread = current ? spreadFor(current.pages, pos.anchor) : 0;

  const faces = (c: number, s: number): Record<Side, Face> => {
    const p = paged[c];
    const face = (i: number): Face =>
      p && p.pages[i] ? { runs: pageRuns(p.flow, p.pages[i]), number: i + 1 } : null;
    return { left: face(s * 2), right: face(s * 2 + 1) };
  };

  /** Where a turn in `dir` lands, or null when there is nothing there (yet). */
  const target = (dir: Direction): Target | null => {
    if (!current) return null;
    const within = spread + dir;
    if (within >= 0 && within < spreadCount(current.pages)) {
      return { chapter: pos.chapter, spread: within, anchor: current.pages[within * 2].start };
    }
    const other = paged[pos.chapter + dir];
    if (!other || other.pages.length === 0) return null;
    const s = dir === 1 ? 0 : spreadCount(other.pages) - 1;
    return { chapter: pos.chapter + dir, spread: s, anchor: other.pages[s * 2].start };
  };
  const forward = target(1);
  const backward = target(-1);

  // A turn that crossed chapters reports back from the turn itself, and the
  // route's `chapter` catching up is its answer, not a new event.
  const jump = (to: Target) => {
    dispatch({ type: 'jump', to });
    if (to.chapter !== pos.chapter) onChapterChange(to.chapter);
  };

  // The turn itself belongs to UIKit's page curl: the sheet bends from where
  // it is grabbed and follows the finger over the crease. It is handed the
  // spreads on either side of this one, and reports back when one lands.
  const Curl = reduceMotion ? null : PageCurlView;
  const sheets = [backward, current ? { chapter: pos.chapter, spread } : null, forward].flatMap(
    (at) => {
      if (!at) return [];
      const pair = faces(at.chapter, at.spread);
      const here = at.chapter === pos.chapter && at.spread === spread;
      return (['left', 'right'] as const).map((side, i) => ({
        key: `${at.chapter}:${at.spread * 2 + i}`,
        here,
        side,
        face: pair[side],
        to: here ? (side === 'left' ? backward : forward) : null,
      }));
    },
  );

  // With Reduce Motion on, a swipe or an edge tap changes the spread at once.
  // The callbacks are worklets (Babel marks a gesture hook's config) and run
  // on the UI thread, so a turn is handed back to React with scheduleOnRN.
  const width = geo?.width ?? 0;
  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-18, 18],
    onDeactivate: (e) => {
      const to = e.translationX < 0 ? forward : backward;
      if (to && Math.abs(e.translationX) > 40) scheduleOnRN(jump, to);
    },
  });
  const tap = useTapGesture({
    maxDuration: 250,
    onDeactivate: (e) => {
      const to = e.x > width * 0.72 ? forward : e.x < width * 0.28 ? backward : null;
      if (!e.canceled && to) scheduleOnRN(jump, to);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const attribution = getTranslation(translationId).attribution;

  return (
    <View ref={ref} onLayout={onLayout} style={styles.spread}>
      {geo && current && Curl && (
        <Curl
          style={[styles.half, { left: geo.spine - geo.half, width: geo.half * 2 }]}
          current={backward ? 2 : 0}
          spreadKey={`${layoutKey}:${pos.chapter}:${spread}`}
          onTurn={({ nativeEvent: { delta } }) => {
            const to = delta > 0 ? forward : backward;
            if (to) jump(to);
          }}>
          {sheets.map(({ key, side, face, to }) => (
            <PageView
              key={key}
              geo={geo}
              colors={colors}
              attribution={attribution}
              side={side}
              face={face}
              left={0}
              onTurn={to ? () => jump(to) : undefined}
            />
          ))}
        </Curl>
      )}
      {geo && current && !Curl && (
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill}>
            {sheets
              .filter((sheet) => sheet.here)
              .map(({ key, side, face, to }) => (
                <PageView
                  key={key}
                  geo={geo}
                  colors={colors}
                  attribution={attribution}
                  side={side}
                  face={face}
                  left={side === 'left' ? geo.spine - geo.half : geo.spine}
                  onTurn={to ? () => jump(to) : undefined}
                />
              ))}
          </View>
        </GestureDetector>
      )}
      {geo &&
        wanted.map((c) =>
          verses[c] && !paged[c] ? (
            <Measurer
              key={`${layoutKey}:${c}`}
              verses={verses[c]}
              geo={geo}
              onPaged={(result) => storePaged(c, result)}
            />
          ) : null,
        )}
    </View>
  );
}

/** Loads the wanted chapters and keeps what it has loaded for this book. */
function useChapterVerses(translationId: string, bookId: string, wanted: number[]) {
  const key = `${translationId}:${bookId}`;
  const [cache, setCache] = useState<{ key: string; chapters: Record<number, Verse[]> }>({
    key,
    chapters: NO_CHAPTERS,
  });
  const chapters = cache.key === key ? cache.chapters : NO_CHAPTERS;
  const missing = wanted.filter((c) => !chapters[c]).join(',');

  useEffect(() => {
    let cancelled = false;
    for (const c of missing.split(',').filter(Boolean).map(Number)) {
      (async () => {
        const rows = await getChapter(translationId, bookId, c);
        if (cancelled) return;
        setCache((prev) => ({
          key,
          chapters: { ...(prev.key === key ? prev.chapters : NO_CHAPTERS), [c]: rows },
        }));
      })().catch(() => {
        // The route reports a failed chapter; a missing neighbour just means
        // the turn stops at this chapter's edge.
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key, missing, translationId, bookId]);

  return chapters;
}

/** Lays a chapter out once, unseen, at page width and reports its pages. */
function Measurer({
  verses,
  geo,
  onPaged,
}: {
  verses: Verse[];
  geo: Geometry;
  onPaged: (result: Paged) => void;
}) {
  const flow = useMemo(() => buildFlow(verses), [verses]);
  const onTextLayout = (e: TextLayoutEvent) =>
    onPaged({ flow, pages: paginate(flow.text, e.nativeEvent.lines, geo.pageHeight) });
  return (
    <View
      style={[styles.measurer, { width: geo.textWidth }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={[styles.passage, { fontFamily: fonts?.scripture }]} onTextLayout={onTextLayout}>
        {flow.segments.map((s) => (
          <Text key={`${s.verse}:${s.kind}`} style={s.kind === 'num' && styles.verseNum}>
            {flow.text.slice(s.start, s.end)}
          </Text>
        ))}
      </Text>
    </View>
  );
}

type PageProps = {
  geo: Geometry;
  colors: ThemeColors;
  attribution: string;
  side: Side;
  face: Face;
};

/** One page's text and footer, placed against the crease. */
function PageContent({
  geo,
  colors,
  attribution,
  side,
  face,
  onTurn,
}: PageProps & { onTurn?: () => void }) {
  const { t } = useTranslation('reader');
  if (!face) return null;
  const box = { width: geo.textWidth, [side === 'left' ? 'right' : 'left']: geo.inner };
  const number = (
    <Text
      accessible
      accessibilityRole={onTurn ? 'button' : 'text'}
      accessibilityLabel={
        onTurn
          ? side === 'left'
            ? t('previousPage')
            : t('nextPage')
          : t('page', { page: face.number })
      }
      // VoiceOver's double-tap: the standard "activate" action replaces the
      // onAccessibilityTap prop React Native 0.88 removed.
      accessibilityActions={onTurn ? ACTIVATE : undefined}
      onAccessibilityAction={onTurn}
      maxFontSizeMultiplier={FOOTER_MAX_SCALE}
      style={[styles.footerText, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
      {face.number}
    </Text>
  );
  return (
    <>
      <View style={[styles.text, box, { top: geo.top, height: geo.pageHeight }]}>
        <Text style={[styles.passage, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {face.runs.map((r) => (
            <Text
              key={r.key}
              style={r.kind === 'num' && [styles.verseNum, { color: colors.inkFaint }]}>
              {r.text}
            </Text>
          ))}
        </Text>
      </View>
      <View style={[styles.footer, box, { bottom: geo.bottom, height: geo.footer }]}>
        {side === 'left' ? (
          number
        ) : (
          <>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={FOOTER_MAX_SCALE}
              style={[
                styles.footerText,
                styles.attribution,
                { color: colors.inkFaint, fontFamily: fonts?.ui },
              ]}>
              {attribution}
            </Text>
            {number}
          </>
        )}
      </View>
    </>
  );
}

/** One side of the spread; `left` places it in whatever holds it. */
function PageView({ left, ...props }: PageProps & { left: number; onTurn?: () => void }) {
  return (
    <View
      style={[styles.half, { left, width: props.geo.half, backgroundColor: props.colors.surface }]}>
      <PageContent {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  spread: { flex: 1, overflow: 'hidden' },
  half: { position: 'absolute', top: 0, bottom: 0 },
  text: { position: 'absolute', overflow: 'hidden' },
  footer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  footerText: { fontSize: 13 },
  attribution: { flexShrink: 1 },
  measurer: { position: 'absolute', top: 0, left: 0, height: 0, opacity: 0, overflow: 'hidden' },
  passage: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  verseNum: { fontSize: 13 },
});
