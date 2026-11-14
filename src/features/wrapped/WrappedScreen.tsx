/**
 * The Year in the Word pager (docs/10 §5.3): full-screen cards, swiped or
 * tapped through like Stories, each shareable as an image. Close and Share
 * live in the native bar so they follow the system bar on iPhone Duo.
 */
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { useBarIcon } from '@/components/bar-icon';
import { closeModal } from '@/components/close-modal';
import { useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { ScreenHeader } from '@/components/screen-header';
import { announce } from '@/components/screen-reader';
import { RecapCard } from '@/features/wrapped/RecapCard';
import { loadRecapView, type RecapView } from '@/features/wrapped/recap-view';
import { ShareStage, type ShareFormat, type ShareStageHandle } from '@/features/wrapped/ShareStage';
import { Button } from '@/components/button';
import { LoadingState, Unavailable } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import { shareGoalChallenge } from '@/services/challenges';
import { markRecapSeen } from '@/services/db/repos/appFlags';
import { getGoal } from '@/services/db/repos/goals';
import { rescheduleAll } from '@/services/notifications';
import type { CardId } from '@/services/wrapped';
import { fonts, layout, radius, spacing, textStyle, useThemeColors } from '@/theme';
import { useMotion } from '@/theme/motion';

/** Card content never spreads wider than this, even on the Duo's inner panel. */
const CARD_MAX_WIDTH = 520;

export function WrappedScreen({ year }: { year: number }) {
  const colors = useThemeColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation(['wrapped', 'common']);
  const { width } = useWindowDimensions();
  const { sides, twoPane } = useContentLayout();
  // The pager's own width: a page is as wide as its pane, not the window.
  const [pagerWidth, setPagerWidth] = useState(0);
  const { bottom } = useSafeAreaInsets();
  const { reduce: reduceMotion } = useMotion();
  const closeIcon = useBarIcon('xmark', 'close');
  const shareIcon = useBarIcon('square.and.arrow.up', 'share');

  const [view, setView] = useState<RecapView | null>(null);
  // A load that threw, kept apart from "still loading" (`view === null`).
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped by Try again to run the load once more.
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const list = useRef<FlatList<CardId>>(null);
  const stage = useRef<ShareStageHandle>(null);

  useEffect(() => {
    let live = true;
    loadRecapView(year)
      .then((v) => {
        if (!live) return;
        setView(v);
        // Seen: the December notice has nothing left to announce.
        if (v.recap.eligible) void markRecapSeen(year).then(rescheduleAll);
      })
      .catch(() => live && setLoadFailed(true));
    return () => {
      live = false;
    };
  }, [year, attempt]);

  const cards = useMemo(() => view?.recap.cards ?? [], [view]);
  const current = cards[index];

  // Keep the page under the finger after a rotation or fold changes the width.
  useEffect(() => {
    if (cards.length > 0) list.current?.scrollToIndex({ index, animated: false });
    // Only the page width changes this; index changes scroll on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagerWidth]);

  // A swipe settles on a page: that page is the current card.
  const onSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const pageWidth = e.nativeEvent.layoutMeasurement.width || 1;
      const settled = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      if (settled >= 0 && settled < cards.length) setIndex(settled);
    },
    [cards.length],
  );

  // For VoiceOver's stepping, further down.
  const indexNow = useRef(index);
  useEffect(() => {
    indexNow.current = index;
  }, [index]);
  const cardViews = useRef(new Map<number, ViewInstance>());
  const steppedByAction = useRef(false);

  // A light tick per card; a success when the summary arrives (07 §8).
  const lastIndex = useRef(0);
  useEffect(() => {
    if (!view || index === lastIndex.current) return;
    lastIndex.current = index;
    if (cards[index] === 'summary') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.selectionAsync();
    if (!steppedByAction.current) {
      // Swiped or tapped: say where the pager landed.
      AccessibilityInfo.announceForAccessibility(t('screen.position', { index: index + 1, total: cards.length }));
      return;
    }
    // Stepped with VoiceOver's adjust gesture: focus was on the card that
    // just scrolled away, so move it to the new one, which reads itself and
    // its position (its accessibility value) — no separate announcement.
    steppedByAction.current = false;
    const timer = setTimeout(
      () => {
        const card = cardViews.current.get(index);
        if (card) AccessibilityInfo.sendAccessibilityEvent(card, 'focus');
      },
      reduceMotion ? 50 : 400,
    );
    return () => clearTimeout(timer);
  }, [index, view, cards, t, reduceMotion]);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= cards.length) return;
      list.current?.scrollToIndex({ index: to, animated: !reduceMotion });
      setIndex(to);
    },
    [cards.length, reduceMotion],
  );

  // VoiceOver's increment / decrement, from whichever card has focus. It
  // steps from the page on screen, not from the focused card's own place:
  // focus can stay on a card that has scrolled away, and stepping from that
  // one would ask for the page already showing.
  const step = useCallback(
    (by: 1 | -1) => {
      const to = indexNow.current + by;
      if (to < 0 || to >= cards.length) return;
      steppedByAction.current = true;
      go(to);
    },
    [cards.length, go],
  );

  const share = useCallback(
    async (format: ShareFormat) => {
      if (!current || sharing) return;
      setSharing(true);
      // The capture takes a moment before the share sheet appears.
      announce(t('screen.sharing'));
      try {
        await stage.current?.share(current, format);
      } catch {
        // An alert, not only an announcement: without it a sighted person
        // taps a format and nothing happens. VoiceOver reads the alert.
        Alert.alert(t('screen.shareFailedTitle'), t('screen.shareFailed'));
      } finally {
        setSharing(false);
      }
    },
    [current, sharing, t],
  );

  const invite = useCallback(async () => {
    const goal = view?.recap.passage && (await getGoal(view.recap.passage.id));
    if (goal) await shareGoalChallenge(goal);
  }, [view]);

  const header = (
    <ScreenHeader backHidden title="">
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon={closeIcon} accessibilityLabel={t('screen.close')} onPress={closeModal}>
          {t('screen.close')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {view?.recap.eligible && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon={shareIcon} accessibilityLabel={t('screen.shareLabel')} disabled={sharing}>
            <Stack.Toolbar.MenuAction icon="rectangle.portrait" onPress={() => void share('story')}>
              {t('screen.storyFormat')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="square" onPress={() => void share('square')}>
              {t('screen.postFormat')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
    </ScreenHeader>
  );

  if (!view) {
    return (
      <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
        {header}
        {loadFailed ? (
          <Unavailable
            kind="failed"
            layout="fill"
            title={t('screen.loadFailedTitle')}
            message={t('common:tryAgainSoon')}
            action={{
              label: t('common:retry'),
              onPress: () => {
                setLoadFailed(false);
                setAttempt((n) => n + 1);
              },
            }}
          />
        ) : (
          // Word counts read passage text, which may be a fetch.
          <LoadingState />
        )}
      </View>
    );
  }

  if (!view.recap.eligible) {
    return (
      <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
        {header}
        {/* The title keeps the recap's New York voice. Close stays in the
            bar; the button is the way to go and do what opens the recap. */}
        <Unavailable
          kind="empty"
          layout="fill"
          titleFont="scripture"
          title={t('screen.notYetTitle')}
          message={t('notYet')}
          action={{ label: t('screen.practiceToday'), onPress: closeModal }}
        />
      </View>
    );
  }

  // `twoPane` — wider than tall (iPhone Duo opened): cards on one side,
  // sharing on the other, as even halves that keep the crease between them
  // when folded.
  const page = pagerWidth || width;

  const ticks = (
    <View style={styles.ticks} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cards.map((c, i) => (
        <View key={c} style={[styles.tick, { backgroundColor: i <= index ? colors.lapis : colors.separator }]} />
      ))}
    </View>
  );

  const inviteButton = view.passage && (
    <Button
      label={t('cards.summary.invite', { next: year + 1 })}
      onPress={() => void invite()}
      style={styles.invite}
    />
  );

  const pager = (
    <View style={styles.pager} onLayout={(e) => setPagerWidth(Math.round(e.nativeEvent.layout.width))}>
      {ticks}
      <FlatList
        ref={list}
        data={cards}
        keyExtractor={(c) => c}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettle}
        extraData={page}
        getItemLayout={(_, i) => ({ length: page, offset: page * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ width: page }}>
            <ScrollView
              contentContainerStyle={[styles.page, { paddingBottom: Math.max(bottom, spacing.xl) }]}
              showsVerticalScrollIndicator={false}>
              <View
                style={styles.cardColumn}
                ref={(node) => {
                  if (node) cardViews.current.set(i, node);
                  else cardViews.current.delete(i);
                }}
                accessible
                // A value, not a hint: hints can be switched off.
                accessibilityValue={{ text: t('screen.position', { index: i + 1, total: cards.length }) }}
                accessibilityActions={[
                  { name: 'increment', label: t('screen.next') },
                  { name: 'decrement', label: t('screen.previous') },
                ]}
                onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
                accessibilityRole="adjustable">
                {i === index ? (
                  <Animated.View
                    key={`on-${i}`}
                    style={styles.fill}
                    // Under Reduce Motion the card still arrives, as the
                    // 200ms crossfade of 07 §8, so the default skip is off.
                    entering={(reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(400)).reduceMotion(
                      ReduceMotion.Never,
                    )}>
                    <RecapCard view={view} card={item} variant="screen" scheme={scheme} />
                  </Animated.View>
                ) : (
                  <RecapCard view={view} card={item} variant="screen" scheme={scheme} />
                )}
                {/* Stories-style taps: left third back, the rest forward. */}
                <Pressable style={[styles.tapZone, styles.tapBack]} onPress={() => go(i - 1)} accessible={false} />
                <Pressable style={[styles.tapZone, styles.tapForward]} onPress={() => go(i + 1)} accessible={false} />
              </View>
              {!twoPane && item === 'summary' && inviteButton}
            </ScrollView>
          </View>
        )}
      />
    </View>
  );

  // The second pane: the same two share formats as the bar's menu, as
  // buttons, plus the summary's invitation.
  const sharePane = twoPane && (
    <View style={[styles.sharePane, { paddingBottom: Math.max(bottom, spacing.xl) }]}>
      <Text accessibilityRole="header" style={[styles.shareHeading, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {t('screen.shareHeading')}
      </Text>
      {(['story', 'square'] as const).map((format) => (
        <Button
          key={format}
          variant="secondary"
          label={t(format === 'story' ? 'screen.storyFormat' : 'screen.postFormat')}
          accessibilityLabel={sharing ? t('screen.sharing') : undefined}
          // The capture takes a moment (layout, two frames, the image).
          busy={sharing}
          onPress={() => void share(format)}
        />
      ))}
      {current === 'summary' && inviteButton}
    </View>
  );

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      {header}
      {/* One tree for both layouts, so the pager keeps its place when the
          window changes shape (FoldAwareRow leaves a lone pane in place). */}
      <FoldAwareRow fill>
        {pager}
        {sharePane}
      </FoldAwareRow>
      {/* One pane: the bar's menu can only dim while the image is made, so
          say so here. Two panes show it on the share buttons instead. */}
      {sharing && !twoPane && (
        <View
          pointerEvents="none"
          style={[styles.sharingNote, { bottom: Math.max(bottom, spacing.xl) }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <View
            style={[styles.sharingPill, { backgroundColor: colors.surfaceRaised, borderColor: colors.separator }]}>
            <ActivityIndicator color={colors.inkFaint} />
            <Text style={[styles.sharingText, { color: colors.ink, fontFamily: fonts?.ui }]}>
              {t('screen.sharing')}
            </Text>
          </View>
        </View>
      )}
      <ShareStage ref={stage} view={view} scheme={scheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  sharePane: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingHorizontal: layout.screenMargin },
  shareHeading: { fontSize: 22, fontWeight: '600', marginBottom: spacing.sm },
  sharingNote: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sharingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '90%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.capsule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sharingText: { ...textStyle.subheadline, flexShrink: 1 },
  ticks: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH + layout.screenMargin * 2,
    alignSelf: 'center',
  },
  tick: { flex: 1, height: 3, borderRadius: 2 },
  page: {
    flexGrow: 1,
    paddingHorizontal: layout.screenMargin,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  cardColumn: {
    flexGrow: 1,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    minHeight: 420,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  tapZone: { position: 'absolute', top: 0, bottom: 0 },
  tapBack: { left: 0, width: '33%' },
  tapForward: { right: 0, width: '67%' },
  invite: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
  },
});
